// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.csv

import com.google.inject.ImplementedBy
import com.opencsv.exceptions.CsvException
import models.user.{Role, User}
import play.api.libs.json.JsValue

import java.io.File

@ImplementedBy(classOf[CsvBuilderImpl])
trait CsvBuilder:
  @throws[java.io.IOException]
  def build(startDate: Long, endDate: Long): File

  @throws[java.io.IOException]
  def build(examId: Long, childIds: List[Long]): File

  @throws[java.io.IOException]
  def build(node: JsValue): File

  @throws[java.io.IOException]
  @throws[CsvException]
  def parseGrades(csvFile: File, user: User, role: Role.Name): Unit
