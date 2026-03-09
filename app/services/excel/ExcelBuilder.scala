// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.excel

import com.google.inject.ImplementedBy
import models.exam.Exam
import models.user.User
import org.apache.poi.ss.usermodel.Workbook
import play.i18n.MessagesApi

import java.io.OutputStream

@ImplementedBy(classOf[ExcelBuilderImpl])
trait ExcelBuilder:

  /** Streams the student score report Excel to the given output stream. Caller must close the
    * stream.
    */
  def streamStudentReport(exam: Exam, student: User, messages: MessagesApi)(os: OutputStream): Unit

  /** Streams an Excel workbook to the given output stream using a row-windowed (SXSSF) workbook.
    * Caller must close the stream.
    */
  def streamTo(os: OutputStream, rowWindowSize: Int = 100)(build: Workbook => Unit): Unit

  /** Streams the "Exam records" sheet. Caller must close the stream. */
  def streamExamRecords(examId: Long, childIds: List[Long])(os: OutputStream): Unit

  /** Streams the "Question scores" sheet. Caller must close the stream. */
  def streamScores(examId: Long, childIds: List[Long])(os: OutputStream): Unit

object ExcelBuilder:
  enum CellType:
    case DECIMAL, STRING
