// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.controllers

import database.EbeanJsonExtensions
import features.exam.services.CourseService
import models.user.Role
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}

import javax.inject.Inject

class CourseController @Inject() (
    authenticated: AuthenticatedAction,
    private val courseService: CourseService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getCourses(filterType: Option[String], criteria: Option[String]): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      courseService
        .listCourses(filterType, criteria, user)
        .map { courses =>
          Ok(courses.asJson)
        }
        .recover { case ex: IllegalArgumentException =>
          BadRequest(ex.getMessage)
        }
    }

  def getCourse(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      _ =>
        courseService.getCourse(id) match
          case Some(course) => Ok(course.asJson)
          case None         => NotFound
    }

  def listUsersCourses(
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        Ok(courseService.getUserCourses(user, examIds, sectionIds, tagIds, ownerIds).asJson)
    }
