// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

import database.EbeanQueryExtensions
import features.facility.services.AccessibilityError.*
import io.ebean.DB
import models.facility.{Accessibility, ExamRoom}

import javax.inject.Inject

class AccessibilityService @Inject() () extends EbeanQueryExtensions:

  def addAccessibility(name: String): Accessibility =
    val accessibility = new Accessibility()
    accessibility.setName(name)
    accessibility.save()
    accessibility

  def updateAccessibility(name: String): Accessibility =
    val accessibility = new Accessibility()
    accessibility.setName(name)
    accessibility.update()
    accessibility

  def removeAccessibility(id: Long): Either[AccessibilityError, Unit] =
    Option(DB.find(classOf[Accessibility], id)) match
      case None => Left(NotFound)
      case Some(accessibility) =>
        DB.find(classOf[ExamRoom])
          .where()
          .in("accessibilities", accessibility)
          .list
          .foreach { er =>
            er.getAccessibilities.remove(accessibility)
            er.update()
          }
        accessibility.delete()
        Right(())

  def listAccessibilityItems: List[Accessibility] =
    DB.find(classOf[Accessibility]).list
