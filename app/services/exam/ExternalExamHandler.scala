// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.exam

import com.google.inject.ImplementedBy
import features.exam.copy.ExamCopyContext
import features.iop.collaboration.services.CollaborativeExamLoaderService
import features.iop.transfer.services.ExternalAttachmentLoaderService
import io.ebean.DB
import io.ebean.text.json.EJson
import models.assessment.ExamInspection
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.Exam
import models.exam.ExamState
import models.exam.GradeType
import models.iop.ExternalExam
import models.questions.QuestionType
import models.sections.ExamSection
import models.user.User
import org.slf4j.LoggerFactory
import play.api.http.Status.*
import play.api.libs.json.Json
import play.api.libs.ws.WSClient
import play.libs.Json as JavaJson
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.enrolment.NoShowHandler
import services.json.EbeanMapper
import services.json.JsonDeserializer
import services.mail.EmailComposer

import java.time.{Duration, Instant}
import java.util.UUID
import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.{Random, Try}

@ImplementedBy(classOf[ExternalExamHandlerImpl])
trait ExternalExamHandler:
  def requestEnrolment(user: User, reservation: Reservation): Future[Option[ExamEnrolment]]
  def createCopyForAssessment(enrolment: ExamEnrolment, externalExam: ExternalExam): Exam

class ExternalExamHandlerImpl @Inject() (
    wsClient: WSClient,
    autoEvaluationHandler: AutoEvaluationHandler,
    noShowHandler: NoShowHandler,
    externalAttachmentLoader: ExternalAttachmentLoaderService,
    emailComposer: EmailComposer,
    collaborativeExamLoader: CollaborativeExamLoaderService,
    configReader: ConfigReader
)(implicit ec: BlockingIOExecutionContext)
    extends ExternalExamHandler:

  private val logger = LoggerFactory.getLogger(classOf[ExternalExamHandlerImpl])

  override def requestEnrolment(
      user: User,
      reservation: Reservation
  ): Future[Option[ExamEnrolment]] =
    val url = parseUrl(reservation.externalRef)
    wsClient.url(url).get().map { response =>
      if response.status != OK then
        logger.warn(
          s"Bad status ${response.status} received while requesting external enrolment data"
        )
        None
      else
        Try {
          // Convert Play JSON to Jackson JsonNode for JsonDeserializer
          val root = JavaJson.parse(Json.stringify(response.json))
          // Create external exam!
          val document = JsonDeserializer.deserialize(classOf[Exam], root)
          // Set references so that:
          // - external ref is the reference we got from outside. Must not be changed.
          // - local ref is a UUID X. It is used locally for referencing the exam
          // - content's hash is set to X in order to simplify things with the frontend

          val externalRef = document.hash
          val ref         = UUID.randomUUID().toString
          document.hash = ref

          // Filter out optional sections
          val optionalSectionsNode: Seq[Long] = if root.has("optionalSections") then
            import scala.jdk.CollectionConverters.*
            root.get("optionalSections").asScala.map(_.asLong()).toSeq
          else Seq.empty[Long]
          val ids: Set[Long] = optionalSectionsNode.toSet
          document.examSections =
            document.examSections.asScala
              .filter(es => !es.optional || ids.contains(es.id))
              .toSet
              .asJava

          // Shuffle multi-choice options
          document.examSections.asScala
            .flatMap(_.sectionQuestions.asScala)
            .foreach { esq =>
              val questionType = Option(esq.question).map(_.`type`)
              questionType match
                case Some(QuestionType.ClaimChoiceQuestion) =>
                  // For ClaimChoiceQuestion, ensure options are sorted by ID
                  // (needed because JSON deserialization doesn't apply @OrderBy)
                  val sorted = esq.options.asScala.sortBy(_.option.id).asJava
                  esq.options = sorted
                case _ if esq.optionShufflingOn =>
                  // Shuffle options for non-claim-choice questions
                  val shuffled = Random.shuffle(esq.options.asScala)
                  esq.options = shuffled.asJava
                case _ => // No shuffling
            }

          // Shuffle section questions if lottery on
          document.examSections.asScala.filter(_.lotteryOn).foreach(_.shuffleQuestions())

          val content =
            val txt = EbeanMapper.create().writeValueAsString(document)
            EJson.parseObject(txt)

          val ee = new ExternalExam()
          ee.externalRef = externalRef
          ee.hash = ref
          ee.content = content
          ee.creator = user
          ee.created = Instant.now()
          ee.save()

          val enrolment = new ExamEnrolment()
          enrolment.externalExam = ee
          enrolment.reservation = reservation
          enrolment.user = user
          enrolment.setRandomDelay()
          enrolment.save()
          enrolment
        }.fold(
          e => {
            logger.error("Failed to create enrolment", e)
            None
          },
          Some(_)
        )
    }

  override def createCopyForAssessment(enrolment: ExamEnrolment, externalExam: ExternalExam): Exam =
    val parent = DB.find(classOf[Exam]).where().eq("hash", externalExam.externalRef).findOne()
    val src    = externalExam.deserialize
    val clone  = createCopy(src, parent, enrolment.user)

    val ep = new ExamParticipation()
    ep.exam = clone
    ep.collaborativeExam = enrolment.collaborativeExam
    ep.user = enrolment.user
    ep.started = externalExam.started
    ep.ended = externalExam.finished
    ep.reservation = enrolment.reservation
    ep.duration =
      Instant.ofEpochMilli(externalExam.finished.toEpochMilli - externalExam.started.toEpochMilli)

    if clone.state == ExamState.REVIEW then
      import scala.jdk.OptionConverters.*
      val settings = configReader.getOrCreateSettings(
        "review_deadline",
        java.util.Optional.empty[String].toScala,
        java.util.Optional.of("14").toScala
      )
      val deadlineDays = settings.value.toInt
      val deadline     = externalExam.finished.plus(Duration.ofDays(deadlineDays))
      ep.deadline = deadline
      if clone.isPrivate then notifyTeachers(clone)
      autoEvaluationHandler.autoEvaluate(clone)

    ep.save()
    clone

  private def createCopy(src: Exam, parent: Exam, user: User): Exam =
    val clone = src.scalarCopy()
    clone.parent = parent
    if Option(src.attachment).isDefined then
      val copy = src.attachment.copy()
      copy.save()
      clone.attachment = copy

    clone.setCreatorWithDate(user)
    clone.setModifierWithDate(user)
    clone.generateHash()
    clone.gradingType = GradeType.GRADED
    clone.save()

    if Option(src.autoEvaluationConfig).isDefined then
      val configClone = src.autoEvaluationConfig.copy()
      configClone.exam = clone
      configClone.save()
      clone.autoEvaluationConfig = configClone

    src.examInspections.asScala.foreach { ei =>
      val inspection = new ExamInspection()
      inspection.user = ei.user
      inspection.assignedBy = ei.assignedBy
      inspection.comment = ei.comment
      inspection.ready = ei.ready
      inspection.exam = clone
      inspection.save()
    }

    val sections = new java.util.TreeSet[ExamSection](src.examSections)
    val context  = ExamCopyContext.forCopyWithAnswers(Some(user)).build()
    sections.asScala.foreach { es =>
      val esCopy = es.copy(clone, context)
      esCopy.setCreatorWithDate(user)
      esCopy.setModifierWithDate(user)
      esCopy.save()
      esCopy.sectionQuestions.asScala.foreach { esq =>
        val questionCopy = esq.question
        questionCopy.setCreatorWithDate(user)
        questionCopy.setModifierWithDate(user)
        questionCopy.update()
        esq.save()
      }
      clone.examSections.add(esCopy)
    }
    clone.save()
    clone

  private def notifyTeachers(exam: Exam): Unit =
    val recipients = (
      exam.parent.examOwners.asScala ++
        exam.examInspections.asScala.map(_.user)
    ).toSet

    emailComposer.scheduleEmail(1.second) {
      recipients.foreach { r =>
        emailComposer.composePrivateExamEnded(r, exam)
        logger.info(s"Email sent to ${r.email}")
      }
    }

  private def parseUrl(args: Any*): String =
    val path = if args.isEmpty then "/api/enrolments/%s" else s"/api/enrolments/${args.head}"
    configReader.getIopHost + path
