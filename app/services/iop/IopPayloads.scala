// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import database.EbeanJsonExtensions
import database.EbeanPaths.props
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.ExamParticipation
import models.exam.Exam
import models.facility.ExamRoom
import models.iop.ExternalExam
import play.api.libs.json.{JsObject, JsValue, Json}
import services.json.EbeanMapper

import java.time.Instant
import java.time.format.DateTimeFormatter

/** The JSON this installation sends to other EXAM installations through XM.
  *
  * This is the IOP wire format: changing what these produce changes the protocol, whatever the
  * reason (a renamed model field, a new path property). `IopPayloadFixturesSpec` compares the
  * output against the fixtures under `test/resources/iop-fixtures/v<IopProtocol.Version>`. When a
  * change is intended, bump [[IopProtocol.Version]], add the fixtures for the new version and add
  * the matching translation step to XM.
  */
object IopPayloads extends EbeanJsonExtensions:

  /** Exam served to the examination site when a visiting student's enrolment is requested */
  val enrolmentPath: PathProperties =
    props[Exam]("""(*,
                  |course(*, gradeScale(*, grades(*))),
                  |executionType(*),
                  |autoEvaluationConfig(*, gradeEvaluations(*, grade(*, gradeScale(*)))),
                  |examFeedbackConfig(*),
                  |examLanguages(*),
                  |attachment(*),
                  |examOwners(*),
                  |examInspections(*, user(*)),
                  |examType(*),
                  |creditType(*),
                  |gradeScale(*, grades(*)),
                  |examSections(*,
                  |  sectionQuestions(*,
                  |    question(*, attachment(*), options(*)),
                  |    options(*, option(*)),
                  |    essayAnswer(*, attachment(*)),
                  |    clozeTestAnswer(*)
                  |  )
                  |)
                  |)""".stripMargin)

  /** Collaborative exam attempt sent to XM for review */
  val collaborativeAssessmentPath: PathProperties =
    props[ExamParticipation]("""(*,
                  |user(*),
                  |exam(*,
                  |  executionType(*),
                  |  examLanguages(*),
                  |  attachment(*),
                  |  autoEvaluationConfig(*, gradeEvaluations(*, grade(*))),
                  |  creditType(*),
                  |  examType(*),
                  |  gradeScale(*, grades(*)),
                  |  examSections(*,
                  |    sectionQuestions(*,
                  |      question(*, attachment(*), options(*)),
                  |      options(*, option(*)),
                  |      essayAnswer(*, attachment(*)),
                  |      clozeTestAnswer(*)
                  |    )
                  |  ),
                  |  examEnrolments(*,
                  |    user(*),
                  |    reservation(*,
                  |      machine(*, room(*))
                  |    )
                  |  )
                  |)
                  |)""".stripMargin)

  private val facilityPath: PathProperties = props[ExamRoom](
    "(*, defaultWorkingHours(*), calendarExceptionEvents(*), mailAddress(*), " +
      "examStartingHours(*), accessibilities(*))"
  )

  private val assessmentTransferPath: PathProperties = props[ExternalExam]("(*, creator(id))")

  private val plainMapper = new ObjectMapper()

  def enrolment(exam: Exam): JsValue = exam.asJson(enrolmentPath)

  /** Whole collaborative exam for updating the XM copy. Uses Jackson because it serializes the
    * entire object. CouchDB expects "rev" (not "_rev") when uploading.
    */
  def collaborativeExam(exam: Exam, revision: String): JsValue =
    val mapper = EbeanMapper.create()
    val node   = mapper.readTree(mapper.writeValueAsString(exam))
    node.asInstanceOf[ObjectNode].put("rev", revision)
    Json.parse(mapper.writeValueAsString(node))

  def collaborativeAssessment(participation: ExamParticipation): String =
    DB.json().toJson(participation, collaborativeAssessmentPath)

  /** Attempt taken here by a visiting student, sent back to the student's home organisation */
  def assessmentTransfer(externalExam: ExternalExam): String =
    plainMapper.readTree(DB.json.toJson(externalExam, assessmentTransferPath)).toString

  def facility(room: ExamRoom): String = DB.json().toJson(room, facilityPath)

  /** Request to reserve a machine at another organisation's facility */
  def reservationRequest(
      homeOrgRef: String,
      start: Instant,
      end: Instant,
      eppn: String,
      email: String,
      optionalSections: Seq[Long]
  ): JsObject = Json.obj(
    "requestingOrg"    -> homeOrgRef,
    "start"            -> DateTimeFormatter.ISO_INSTANT.format(start),
    "end"              -> DateTimeFormatter.ISO_INSTANT.format(end),
    "user"             -> eppn,
    "email"            -> email,
    "optionalSections" -> Json.toJson(optionalSections)
  )
