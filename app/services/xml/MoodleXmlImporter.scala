// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.xml

import models.questions.Question
import models.user.User

trait MoodleXmlImporter:
  case class ConversionResult(
      question: Option[Question] = None,
      error: Option[String] = None,
      questionType: Option[String] = None
  )

  def convert(questions: String, user: User): (Seq[Question], Seq[ConversionResult])
