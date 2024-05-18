// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util.xml

import models.questions.Question

trait MoodleXmlExporter:
  def convert(questions: Seq[Question]): String
