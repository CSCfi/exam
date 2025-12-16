// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.excel

import com.google.inject.ImplementedBy
import models.exam.Exam
import models.user.User
import play.i18n.MessagesApi

import java.io.ByteArrayOutputStream

@ImplementedBy(classOf[ExcelBuilderImpl])
trait ExcelBuilder:

  @throws[java.io.IOException]
  def build(examId: Long, childIds: List[Long]): ByteArrayOutputStream

  @throws[java.io.IOException]
  def buildScoreExcel(examId: Long, childIds: List[Long]): ByteArrayOutputStream

  @throws[java.io.IOException]
  def buildStudentReport(exam: Exam, student: User, messages: MessagesApi): ByteArrayOutputStream

object ExcelBuilder:
  enum CellType:
    case DECIMAL, STRING
