// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.xml

import models.questions.Question

import java.io.OutputStream

trait MoodleXmlExporter:
  def convert(questions: Seq[Question]): String

  /** Writes Moodle XML for the given questions to the output stream. Caller must close the stream.
    */
  def writeToStream(questions: Seq[Question])(os: OutputStream): Unit
