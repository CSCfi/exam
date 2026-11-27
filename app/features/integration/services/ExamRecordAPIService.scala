// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanPaths.path
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{ExamRecord, ExamScore}
import org.apache.pekko.NotUsed
import org.apache.pekko.stream.scaladsl.Source
import services.datetime.TimeUtils

import javax.inject.Inject
import scala.concurrent.ExecutionContext

object ExamRecordAPIService:
  private val PageSize = 1000

class ExamRecordAPIService @Inject() () extends EbeanQueryExtensions:
  import ExamRecordAPIService.PageSize

  /** Scores of releasable records newer than `startDate`, in keyset pages by record id. An early
    * start date covers the whole history, so the records are never all held in memory at once.
    */
  def getNewRecords(startDate: String)(using ExecutionContext): Source[List[ExamScore], NotUsed] =
    val start = TimeUtils.parseInstant(startDate)
    keysetPages(PageSize, (r: ExamRecord) => r.id.longValue) { after =>
      val query = DB
        .find(classOf[ExamRecord])
        .fetch(path[ExamRecord]("examScore"))
        .where()
        .eq(path[ExamRecord]("releasable"), true)
        .gt(path[ExamRecord]("timeStamp"), start)
      after
        .fold(query)(id => query.gt(path[ExamRecord]("id"), id))
        .orderBy(path[ExamRecord]("id"))
        .setMaxRows(PageSize)
        .list
    }(_.flatMap(record => Option(record.examScore)))
