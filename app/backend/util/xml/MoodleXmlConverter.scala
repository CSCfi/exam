package backend.util.xml

import backend.models.questions.Question

trait MoodleXmlConverter {
  def convert(questions: Seq[Question]): String
}
