// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{ExamRecord, ExamScore}
import services.datetime.TimeUtils

import javax.inject.Inject

class ExamRecordAPIService @Inject() () extends EbeanQueryExtensions:

  def getNewRecords(startDate: String): List[ExamScore] =
    val start = TimeUtils.parseInstant(startDate)
    DB.find(classOf[ExamRecord])
      .fetch("examScore")
      .where()
      .eq("releasable", true)
      .gt("timeStamp", start)
      .list
      .flatMap(record => Option(record.examScore))
