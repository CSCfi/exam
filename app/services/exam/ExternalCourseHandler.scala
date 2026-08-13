// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.exam

import com.google.inject.ImplementedBy
import models.exam.Course
import models.user.User

import scala.concurrent.Future

@ImplementedBy(classOf[ExternalCourseHandlerImpl])
trait ExternalCourseHandler:
  def getCoursesByCode(user: User, code: String): Future[Set[Course]]
  def getPermittedCourses(user: User): Future[Set[String]]
