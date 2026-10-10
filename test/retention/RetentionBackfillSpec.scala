// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.user.{Role, User}
import org.joda.time.DateTime

import java.nio.file.{Files, Path}

/** Evolution 151 gives retention a time to count from for accounts that never logged in and for
  * enrolments with no reservation, examination event or enrolment time.
  */
class RetentionBackfillSpec extends RetentionSpecBase:

  // The Ups of evolution 151, split into statements the way Play does
  private def applyEvolution151(): Unit =
    val script = Files.readString(Path.of("conf/evolutions/default/151.sql"))
    val ups    = script.split("# --- !Ups")(1).split("# --- !Downs")(0)
    ups
      .split("(?<!;);(?!;)")
      .map(_.trim)
      .filter(_.nonEmpty)
      .foreach(sql => DB.sqlUpdate(sql).execute())

  "Evolution 151" should:
    "make accounts without a login time and enrolments without any time expire" in:
      setup()
      val neverLoggedIn = newUser("nella", t0, Role.Name.STUDENT)
      neverLoggedIn.lastLogin = null
      neverLoggedIn.update()
      val student   = newUser("niilo", t0, Role.Name.STUDENT)
      val enrolment = new ExamEnrolment
      enrolment.user = student
      enrolment.exam = prototype()
      enrolment.save()
      val later = DateTime.now.plusYears(3)

      // Without a time to count from, neither is ever due
      run(later)
      exists(classOf[User], neverLoggedIn.id) mustBe true
      exists(classOf[ExamEnrolment], enrolment.id) mustBe true

      applyEvolution151()
      val before = DateTime.now.minusMinutes(1)
      DB.find(classOf[User], neverLoggedIn.id).lastLogin.getTime must be > before.getMillis
      DB.find(classOf[ExamEnrolment], enrolment.id).enrolledOn.isAfter(before) mustBe true

      run(later)
      exists(classOf[User], neverLoggedIn.id) mustBe false
      exists(classOf[ExamEnrolment], enrolment.id) mustBe false
      exists(classOf[User], student.id) mustBe false

    "leave times that are already known alone" in:
      setup()
      val a          = attempt(newUser("noora", t0, Role.Name.STUDENT))
      val enrolledOn = DB.find(classOf[ExamEnrolment], a.enrolment.id).enrolledOn

      applyEvolution151()

      DB.find(classOf[User], a.student.id).lastLogin.getTime mustBe t0.getMillis
      DB.find(classOf[ExamEnrolment], a.enrolment.id).enrolledOn mustBe enrolledOn
