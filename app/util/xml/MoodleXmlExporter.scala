package util.xml

import models.questions.Question

trait MoodleXmlExporter:
  def convert(questions: Seq[Question]): String
