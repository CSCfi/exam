// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.excel

import com.google.inject.ImplementedBy
import models.assessment.ExamRecord
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.user.User
import org.apache.poi.ss.usermodel.Workbook
import play.i18n.MessagesApi

import java.io.OutputStream

@ImplementedBy(classOf[ExcelBuilderImpl])
trait ExcelBuilder:

  /** Streams an Excel workbook to the given output stream using a row-windowed (SXSSF) workbook.
    * Caller must close the stream.
    */
  def streamTo(os: OutputStream, rowWindowSize: Int = 100)(build: Workbook => Unit): Unit

  // --- Assessment reports ---

  /** Streams the student score report. Caller must close the stream. */
  def streamStudentReport(exam: Exam, student: User, messages: MessagesApi)(os: OutputStream): Unit

  /** Streams the "Exam records" sheet. Caller must close the stream. */
  def streamExamRecords(examRecords: List[ExamRecord])(os: OutputStream): Unit

  /** Streams the "Question scores" sheet. Caller must close the stream. */
  def streamScores(parentExam: Exam, childExams: List[Exam])(os: OutputStream): Unit

  // --- Statistics / admin reports ---

  /** Streams a single exam's metadata sheet. Caller must close the stream. */
  def streamExam(exam: Exam)(os: OutputStream): Unit

  /** Streams the teacher's exams report. Caller must close the stream. */
  def streamTeacherExams(exams: List[Exam])(os: OutputStream): Unit

  /** Streams the enrolments sheet for a parent exam. Caller must close the stream. */
  def streamEnrolments(proto: Exam)(os: OutputStream): Unit

  /** Streams the graded-exams reviews report. Caller must close the stream. */
  def streamReviews(exams: List[Exam])(os: OutputStream): Unit

  /** Streams the room reservations report. Caller must close the stream. */
  def streamReservations(enrolments: List[ExamEnrolment])(os: OutputStream): Unit

  /** Streams the all-exams participations report. Caller must close the stream. */
  def streamAllExams(participations: List[ExamParticipation])(os: OutputStream): Unit

  /** Streams the student activity report (two sheets). Caller must close the stream. */
  def streamStudentActivity(student: User, participations: List[ExamParticipation])(
      os: OutputStream
  ): Unit

object ExcelBuilder:
  enum CellType:
    case DECIMAL, STRING
