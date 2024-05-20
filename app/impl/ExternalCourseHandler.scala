// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import com.google.inject.ImplementedBy
import models.Course
import models.User

import scala.concurrent.Future

@ImplementedBy(classOf[ExternalCourseHandlerImpl])
trait ExternalCourseHandler:
  def getCoursesByCode(user: User, code: String): Future[Set[Course]]
  def getPermittedCourses(user: User): Future[Set[String]]
