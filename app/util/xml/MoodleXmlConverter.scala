package util.xml

import models.questions.Question

trait MoodleXmlConverter {
  def convert(questions: Seq[Question]): String
}
