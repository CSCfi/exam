// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package question

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.questions.{Question, Tag}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.Session

class TagControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def tagQuestion(user: User, question: Question, name: String): Tag =
    val tag = new Tag
    tag.name = name
    tag.setCreatorWithDate(user)
    tag.save()
    question.tags.add(tag)
    question.update()
    tag

  private def listTagIds(query: String, session: Session): Set[Long] =
    val result = runIO(get(s"/app/tags?$query", session = session))
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.map(t => (t \ "id").as[Long]).toSet

  "TagController" when:
    "listing tags" should:
      "filter by question owner" in:
        val (user, session) = runIO(loginAsTeacher())
        val questions       = DB.find(classOf[Question]).list
        val owned           = questions.head
        owned.questionOwners.add(user)
        owned.update()
        val other = questions
          .find(q => q.id != owned.id && !q.questionOwners.contains(user))
          .getOrElse(fail("No question without the teacher as owner in test data"))
        val ownedTag = tagQuestion(user, owned, "owned")
        val otherTag = tagQuestion(user, other, "other")

        val ids = listTagIds(s"ownerIds=${user.id}", session)
        ids must contain(ownedTag.id)
        ids must not contain otherTag.id
