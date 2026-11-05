// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.questions.Tag
import models.sections.ExamSection
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.Session

import scala.jdk.CollectionConverters.*

class ExamSectionControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  /** Makes the teacher own a section and tags one of its questions, owned by the teacher as well.
    */
  private def setup(user: User): (ExamSection, Tag) =
    val section = DB
      .find(classOf[ExamSection])
      .list
      .find(!_.sectionQuestions.isEmpty)
      .getOrElse(fail("No section with questions in test data"))
    section.creator = user
    section.update()
    val tag = new Tag
    tag.name = "section-filter"
    tag.setCreatorWithDate(user)
    tag.save()
    val question = section.sectionQuestions.asScala.head.question
    question.tags.add(tag)
    question.questionOwners.add(user)
    question.update()
    (section, tag)

  private def listSectionIds(query: String, session: Session): Set[Long] =
    val result = runIO(get(s"/app/sections?$query", session = session))
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.map(s => (s \ "id").as[Long]).toSet

  "ExamSectionController" when:
    "listing sections" should:
      "filter by tag" in:
        val (user, session) = runIO(loginAsTeacher())
        val (section, tag)  = setup(user)
        listSectionIds(s"tagIds=${tag.id}", session) must be(Set(section.id))

      "filter by question owner" in:
        val (user, session) = runIO(loginAsTeacher())
        val (section, _)    = setup(user)
        listSectionIds(s"ownerIds=${user.id}", session) must contain(section.id)

      "filter by tag and question owner" in:
        val (user, session) = runIO(loginAsTeacher())
        val (section, tag)  = setup(user)
        listSectionIds(s"tagIds=${tag.id}&ownerIds=${user.id}", session) must be(Set(section.id))
