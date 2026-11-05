// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanPaths.{path, props}
import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.exam.ExamState
import models.exam.{Exam, ExamExecutionType}
import services.datetime.TimeUtils

import java.time.Instant
import javax.inject.Inject

class ExamAPIService @Inject() () extends EbeanQueryExtensions:

  def getActiveExams(date: Option[String]): List[Exam] =
    val pp = props[Exam](
      """(course(name, code, credits,
        |  gradeScale(description, externalRef, displayName),
        |  organisation(code, name, nameAbbreviation)
        |),
        |id, name, periodStart, periodEnd, duration, enrollInstruction,
        |examLanguages(code, name),
        |gradeScale(description, externalRef, displayName),
        |examOwners(firstName, lastName, email),
        |examType(type)
        |)""".stripMargin
    )
    val dateTime = date.map(TimeUtils.parseInstant).getOrElse(Instant.now())
    DB.find(classOf[Exam])
      .apply(pp)
      .where()
      .eq(path[Exam]("state"), ExamState.PUBLISHED)
      .ge(path[Exam]("periodEnd"), dateTime)
      .eq(path[Exam]("executionType.type"), ExamExecutionType.Type.PUBLIC.toString)
      .list
