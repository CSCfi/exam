// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.exam.Exam
import models.user.User
import play.api.http.Status
import play.api.libs.json.*

import scala.jdk.CollectionConverters.*

/** The exam dropdown of the question library: GET /app/examsearch. */
class ExamSearchSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def teacher(): User =
    DB.find(classOf[User])
      .where()
      .eq("email", "teacher@funet.fi")
      .find
      .getOrElse(fail("Teacher not found in test data"))

  /** Top-level exams the listing can return, i.e. those with a name and a course. */
  private def listable(): List[Exam] =
    DB.find(classOf[Exam]).where().isNotNull("name").isNotNull("course").isNull("parent").list

  "ExamController" when:
    "searching exams" should:
      "filter by exam owner" in:
        val (_, session) = runIO(loginAsAdmin())
        val owner        = teacher()
        val exams        = listable()
        exams must not be empty
        val owned = exams.head
        owned.examOwners.add(owner)
        owned.update()
        val expected =
          listable().filter(_.examOwners.asScala.exists(_.id == owner.id)).map(_.id.longValue).toSet

        val result = runIO(get(s"/app/examsearch?ownerIds=${owner.id}", session = session))
        statusOf(result) must be(Status.OK)
        val ids = contentAsJsonOf(result).as[JsArray].value.map(e => (e \ "id").as[Long]).toSet
        ids must contain(owned.id.longValue)
        ids must be(expected)
