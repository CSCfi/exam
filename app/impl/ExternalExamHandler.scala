// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import com.fasterxml.jackson.databind.ObjectMapper
import com.google.inject.ImplementedBy
import controllers.exam.copy.ExamCopyContext
import controllers.iop.collaboration.api.CollaborativeExamLoader
import controllers.iop.transfer.api.ExternalAttachmentLoader
import impl.mail.EmailComposer
import io.ebean.DB
import io.ebean.text.json.EJson
import miscellaneous.config.ConfigReader
import miscellaneous.json.JsonDeserializer
import models.assessment.ExamInspection
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.{Exam, Grade}
import models.iop.ExternalExam
import models.questions.Question
import models.sections.ExamSection
import models.user.User
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import org.slf4j.LoggerFactory
import org.springframework.beans.BeanUtils
import play.api.http.Status.*
import play.api.libs.json.Json
import play.api.libs.ws.WSClient
import play.libs.Json as JavaJson

import java.util.UUID
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.Random

@ImplementedBy(classOf[ExternalExamHandlerImpl])
trait ExternalExamHandler:
  def requestEnrolment(user: User, reservation: Reservation): Future[Option[ExamEnrolment]]
  def createCopyForAssessment(enrolment: ExamEnrolment, externalExam: ExternalExam): Exam

class ExternalExamHandlerImpl @Inject() (
    wsClient: WSClient,
    autoEvaluationHandler: AutoEvaluationHandler,
    noShowHandler: NoShowHandler,
    externalAttachmentLoader: ExternalAttachmentLoader,
    actorSystem: ActorSystem,
    emailComposer: EmailComposer,
    collaborativeExamLoader: CollaborativeExamLoader,
    configReader: ConfigReader
)(implicit ec: ExecutionContext)
    extends ExternalExamHandler:

  private val logger = LoggerFactory.getLogger(classOf[ExternalExamHandlerImpl])

  override def requestEnrolment(user: User, reservation: Reservation): Future[Option[ExamEnrolment]] =
    val url = parseUrl(reservation.getExternalRef)
    wsClient.url(url).get().map { response =>
      if response.status != OK then
        logger.warn(s"Bad status ${response.status} received while requesting external enrolment data")
        None
      else
        try
          // Convert Play JSON to Jackson JsonNode for JsonDeserializer
          val root = JavaJson.parse(Json.stringify(response.json))
          // Create external exam!
          val document = JsonDeserializer.deserialize(classOf[Exam], root)
          // Set references so that:
          // - external ref is the reference we got from outside. Must not be changed.
          // - local ref is a UUID X. It is used locally for referencing the exam
          // - content's hash is set to X in order to simplify things with the frontend

          val externalRef = document.getHash
          val ref         = UUID.randomUUID().toString
          document.setHash(ref)

          // Filter out optional sections
          val optionalSectionsNode: Seq[Long] = if root.has("optionalSections") then
            import scala.jdk.CollectionConverters.*
            root.get("optionalSections").asScala.map(_.asLong()).toSeq
          else Seq.empty[Long]
          val ids: Set[Long] = optionalSectionsNode.toSet
          document.setExamSections(
            document.getExamSections.asScala
              .filter(es => !es.isOptional || ids.contains(es.getId))
              .toSet
              .asJava
          )

          // Shuffle multi-choice options
          document.getExamSections.asScala
            .flatMap(_.getSectionQuestions.asScala)
            .foreach { esq =>
              val questionType = Option(esq.getQuestion).map(_.getType)
              questionType match
                case Some(Question.Type.ClaimChoiceQuestion) =>
                  // For ClaimChoiceQuestion, ensure options are sorted by ID
                  // (needed because JSON deserialization doesn't apply @OrderBy)
                  val sorted = esq.getOptions.asScala.sortBy(_.getOption.getId).asJava
                  esq.setOptions(sorted)
                case _ if esq.isOptionShufflingOn =>
                  // Shuffle options for non-claim-choice questions
                  val shuffled = Random.shuffle(esq.getOptions.asScala)
                  esq.setOptions(shuffled.asJava)
                case _ => // No shuffling
            }

          // Shuffle section questions if lottery on
          document.getExamSections.asScala.filter(_.isLotteryOn).foreach(_.shuffleQuestions())

          val content =
            val om  = new ObjectMapper()
            val txt = om.writeValueAsString(document)
            EJson.parseObject(txt)

          val ee = new ExternalExam()
          ee.setExternalRef(externalRef)
          ee.setHash(ref)
          ee.setContent(content)
          ee.setCreator(user)
          ee.setCreated(DateTime.now())
          ee.save()

          val enrolment = new ExamEnrolment()
          enrolment.setExternalExam(ee)
          enrolment.setReservation(reservation)
          enrolment.setUser(user)
          enrolment.setRandomDelay()
          enrolment.save()
          Some(enrolment)
        catch
          case e: Exception =>
            logger.error("Failed to create enrolment", e)
            None
    }

  override def createCopyForAssessment(enrolment: ExamEnrolment, externalExam: ExternalExam): Exam =
    val parent = DB.find(classOf[Exam]).where().eq("hash", externalExam.getExternalRef).findOne()
    val src    = externalExam.deserialize()
    val clone  = createCopy(src, parent, enrolment.getUser)

    val ep = new ExamParticipation()
    ep.setExam(clone)
    ep.setCollaborativeExam(enrolment.getCollaborativeExam)
    ep.setUser(enrolment.getUser)
    ep.setStarted(externalExam.getStarted)
    ep.setEnded(externalExam.getFinished)
    ep.setReservation(enrolment.getReservation)
    ep.setDuration(new DateTime(externalExam.getFinished.getMillis - externalExam.getStarted.getMillis))

    if clone.getState == Exam.State.REVIEW then
      import scala.jdk.OptionConverters.*
      val settings = configReader.getOrCreateSettings(
        "review_deadline",
        java.util.Optional.empty[String].toScala,
        java.util.Optional.of("14").toScala
      )
      val deadlineDays = settings.getValue.toInt
      val deadline     = externalExam.getFinished.plusDays(deadlineDays)
      ep.setDeadline(deadline)
      if clone.isPrivate then notifyTeachers(clone)
      autoEvaluationHandler.autoEvaluate(clone)

    ep.save()
    clone

  private def createCopy(src: Exam, parent: Exam, user: User): Exam =
    val clone = new Exam()
    BeanUtils.copyProperties(
      src,
      clone,
      "id",
      "parent",
      "attachment",
      "examSections",
      "examEnrolments",
      "examParticipation",
      "examInspections",
      "autoEvaluationConfig",
      "creator",
      "created",
      "examOwners"
    )
    clone.setParent(parent)
    if Option(src.getAttachment).isDefined then
      val copy = src.getAttachment.copy()
      copy.save()
      clone.setAttachment(copy)

    clone.setCreatorWithDate(user)
    clone.setModifierWithDate(user)
    clone.generateHash()
    clone.setGradingType(Grade.Type.GRADED)
    clone.save()

    if Option(src.getAutoEvaluationConfig).isDefined then
      val configClone = src.getAutoEvaluationConfig.copy()
      configClone.setExam(clone)
      configClone.save()
      clone.setAutoEvaluationConfig(configClone)

    src.getExamInspections.asScala.foreach { ei =>
      val inspection = new ExamInspection()
      BeanUtils.copyProperties(ei, inspection, "id", "exam")
      inspection.setExam(clone)
      inspection.save()
    }

    val sections = new java.util.TreeSet[ExamSection](src.getExamSections)
    val context  = ExamCopyContext.forCopyWithAnswers(user).build()
    sections.asScala.foreach { es =>
      val esCopy = es.copy(clone, context)
      esCopy.setCreatorWithDate(user)
      esCopy.setModifierWithDate(user)
      esCopy.save()
      esCopy.getSectionQuestions.asScala.foreach { esq =>
        val questionCopy = esq.getQuestion
        questionCopy.setCreatorWithDate(user)
        questionCopy.setModifierWithDate(user)
        questionCopy.update()
        esq.save()
      }
      clone.getExamSections.add(esCopy)
    }
    clone.save()
    clone

  private def notifyTeachers(exam: Exam): Unit =
    val recipients = (
      exam.getParent.getExamOwners.asScala ++
        exam.getExamInspections.asScala.map(_.getUser)
    ).toSet

    actorSystem.scheduler.scheduleOnce(1.second) {
      recipients.foreach { r =>
        emailComposer.composePrivateExamEnded(r, exam)
        logger.info(s"Email sent to ${r.getEmail}")
      }
    }

  private def parseUrl(args: Any*): String =
    val path = if args.isEmpty then "/api/enrolments/%s" else s"/api/enrolments/${args.head}"
    configReader.getIopHost + path
