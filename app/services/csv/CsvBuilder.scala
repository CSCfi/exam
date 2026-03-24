// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.csv

import com.google.inject.ImplementedBy
import com.opencsv.CSVWriter
import com.opencsv.exceptions.CsvException
import models.user.{Role, User}
import play.api.libs.json.JsValue

import java.io.{File, OutputStream}

@ImplementedBy(classOf[CsvBuilderImpl])
trait CsvBuilder:
  /** UTF-8 CSV output with flush on exit; does not close the stream. Caller must close the stream.
    */
  def streamTo(os: OutputStream)(build: CSVWriter => Unit): Unit

  /** Streams CSV (exam records by date range) to the given output stream. Caller must close the
    * stream.
    */
  def streamExamRecordsByDate(startDate: Long, endDate: Long)(os: OutputStream): Unit

  /** Streams CSV (exam records for given exam/children) to the given output stream. Caller must
    * close the stream.
    */
  def streamExamRecords(examId: Long, childIds: List[Long])(os: OutputStream): Unit

  /** Streams CSV (assessments from JSON array) to the given output stream. Caller must close the
    * stream.
    */
  def streamAssessments(node: JsValue)(os: OutputStream): Unit

  @throws[java.io.IOException]
  @throws[CsvException]
  def parseGrades(csvFile: File, user: User, role: Role.Name): Unit
