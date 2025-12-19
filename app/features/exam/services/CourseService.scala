// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.exam.Course
import models.user.User
import services.config.ConfigReader
import services.exam.ExternalCourseHandler

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._

class CourseService @Inject() (
    private val externalApi: ExternalCourseHandler,
    private val configReader: ConfigReader,
    implicit private val ec: ExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions:

  def listCourses(
      filterType: Option[String],
      criteria: Option[String],
      user: User
  ): Future[List[Course]] =
    (filterType, criteria) match
      case (Some("code"), Some(c)) =>
        externalApi.getCoursesByCode(user, c.trim).map(_.toList)
      case (Some("name"), Some(x)) if x.length >= 2 =>
        Future {
          DB.find(classOf[Course])
            .where
            .disjunction()
            .isNull("endDate")
            .gt("endDate", org.joda.time.DateTime.now())
            .endJunction()
            .ilike("name", s"%$x%")
            .orderBy("code")
            .list
            .filter(c =>
              Option(c.getStartDate).isEmpty || configReader
                .getCourseValidityDate(new org.joda.time.DateTime(c.getStartDate))
                .isBeforeNow
            )
        }
      case (Some("name"), Some(_)) =>
        Future.failed(
          new IllegalArgumentException("Search criteria too short (minimum 2 characters)")
        )
      case _ =>
        Future {
          DB.find(classOf[Course]).where.isNotNull("name").orderBy("code").list
        }

  def getCourse(courseId: Long): Option[Course] =
    Option(DB.find(classOf[Course], courseId))

  def getUserCourses(
      user: User,
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): List[Course] =
    val baseQuery = DB.find(classOf[Course]).where.isNotNull("name")
    val withOwnerFilter =
      if !user.hasRole(models.user.Role.Name.ADMIN) then baseQuery.eq("exams.examOwners", user)
      else baseQuery
    val withExamFilter = examIds.filter(_.nonEmpty).fold(withOwnerFilter) { ids =>
      withOwnerFilter.in("exams.id", ids.asJava)
    }
    val withSectionFilter = sectionIds.filter(_.nonEmpty).fold(withExamFilter) { ids =>
      withExamFilter.in("exams.examSections.id", ids.asJava)
    }
    val withTagFilter = tagIds.filter(_.nonEmpty).fold(withSectionFilter) { ids =>
      withSectionFilter.in(
        "exams.examSections.sectionQuestions.question.parent.tags.id",
        ids.asJava
      )
    }
    val query = ownerIds.filter(_.nonEmpty).fold(withTagFilter) { ids =>
      withTagFilter.in("exams.examOwners.id", ids.asJava)
    }
    query.orderBy("name desc").list
