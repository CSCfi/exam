// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util.xml

import models.User
import models.questions.Question

trait MoodleXmlImporter:
  def convert(questions: String, user: User): Seq[Question]
