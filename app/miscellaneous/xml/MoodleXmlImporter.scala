// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.xml

import models.questions.Question
import models.user.User

trait MoodleXmlImporter:
  def convert(questions: String, user: User): Seq[Question]
