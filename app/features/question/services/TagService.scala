// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.questions.{Question, Tag}
import models.user.{Role, User}

import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class TagService @Inject() () extends EbeanQueryExtensions:

  def listTags(
      user: User,
      filter: Option[String],
      courseIds: Option[List[Long]],
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): (List[Tag], PathProperties) =
    val baseQuery = DB.find(classOf[Tag]).where()
    val queryWithUser =
      if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then baseQuery
      else baseQuery.eq("creator.id", user.getId)

    val queryWithFilter = filter.fold(queryWithUser) { f =>
      queryWithUser.ilike("name", s"%$f%")
    }

    val queryWithExams = examIds.fold(queryWithFilter) { ids =>
      if ids.nonEmpty then queryWithFilter.in("questions.examSectionQuestions.examSection.exam.id", ids.asJava)
      else queryWithFilter
    }

    val queryWithCourses = courseIds.fold(queryWithExams) { ids =>
      if ids.nonEmpty then queryWithExams.in("questions.examSectionQuestions.examSection.exam.course.id", ids.asJava)
      else queryWithExams
    }

    val queryWithSections = sectionIds.fold(queryWithCourses) { ids =>
      if ids.nonEmpty then queryWithCourses.in("questions.examSectionQuestions.examSection.id", ids.asJava)
      else queryWithCourses
    }

    val finalQuery = ownerIds.fold(queryWithSections) { ids =>
      if ids.nonEmpty then queryWithSections.in("questions.questionOwners.id", ids.asJava)
      else queryWithSections
    }

    val tags = finalQuery.distinct.toList
    val pp   = PathProperties.parse("(*, creator(id), questions(id))")
    (tags, pp)

  def addTagToQuestions(questionIds: List[Long], tagId: Long): Either[TagError, Unit] =
    val questions = DB.find(classOf[Question]).where().idIn(questionIds.asJava).list
    Option(DB.find(classOf[Tag], tagId)) match
      case Some(tag) =>
        questions.foreach { question =>
          if !question.getTags.contains(tag) then
            question.getTags.add(tag)
            question.update()
        }
        Right(())
      case None => Left(TagError.TagNotFound)
