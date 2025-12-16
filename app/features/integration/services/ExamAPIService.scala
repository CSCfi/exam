// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.exam.{Exam, ExamExecutionType}
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat

import javax.inject.Inject

class ExamAPIService @Inject() () extends EbeanQueryExtensions:

  def getActiveExams(date: Option[String]): List[Exam] =
    val pp = PathProperties.parse(
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
    val dateTime = date
      .map(ISODateTimeFormat.dateTimeParser().parseDateTime)
      .getOrElse(DateTime.now())

    val query = DB.find(classOf[Exam])
    query.apply(pp)
    query
      .where()
      .eq("state", Exam.State.PUBLISHED)
      .ge("periodEnd", dateTime)
      .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString)
      .list
