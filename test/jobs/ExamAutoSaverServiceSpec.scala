// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package jobs

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.*
import models.enrolment.{ExamParticipation, Reservation}
import models.exam.*
import models.facility.ExamMachine
import models.user.{Language, User}
import org.joda.time.DateTime
import system.jobs.ExamAutoSaverService

import scala.jdk.CollectionConverters.*

/** Exams the student never turned in get auto-evaluated once the job ends them. */
class ExamAutoSaverServiceSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  "The exam auto saver" should:
    "auto-evaluate the exams it ends" in:
      val _ = app
      ensureTestDataLoaded()
      val student = new User
      student.eppn = "auto-eval-student@test.org"
      student.email = student.eppn
      student.firstName = "Test"
      student.lastName = "Student"
      student.language = DB.find(classOf[Language]).where().eq("code", "en").find.orNull
      student.save()

      val exam = new Exam
      exam.name = "Auto-evaluated"
      exam.state = ExamState.STUDENT_STARTED
      exam.duration = 60
      exam.executionType = DB.find(classOf[ExamExecutionType]).where()
        .eq("type", ExamExecutionType.Type.PUBLIC.toString).find.get
      exam.gradeScale = DB.find(classOf[GradeScale]).list.find(!_.grades.isEmpty).get
      exam.creator = student
      exam.examLanguages = new java.util.ArrayList(List(student.language).asJava)
      exam.generateHash()
      exam.save()

      val config = new AutoEvaluationConfig
      config.releaseType = AutoEvaluationReleaseType.IMMEDIATE
      config.gradeEvaluations = new java.util.HashSet()
      exam.gradeScale.grades.asScala.foreach { grade =>
        val ge = new GradeEvaluation
        ge.grade = grade
        ge.percentage = 0
        config.gradeEvaluations.add(ge)
      }
      config.exam = exam
      config.save()

      val reservation = new Reservation
      reservation.startAt = DateTime.now.minusHours(3)
      reservation.endAt = DateTime.now.minusHours(2)
      reservation.user = student
      reservation.machine =
        DB.find(classOf[ExamMachine]).list.find(m => Option(m.room).nonEmpty).get
      reservation.save()

      val participation = new ExamParticipation
      participation.exam = exam
      participation.user = student
      participation.reservation = reservation
      participation.started = DateTime.now.minusHours(3)
      participation.save()

      runIO(app.injector.instanceOf(classOf[ExamAutoSaverService]).runCheck())

      val graded = DB.find(classOf[Exam], exam.id)
      graded.state mustBe ExamState.GRADED
      graded.grade must not be null
      graded.autoEvaluationNotified must not be null
