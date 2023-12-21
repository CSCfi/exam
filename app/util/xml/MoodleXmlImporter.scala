package util.xml

import models.User
import models.questions.Question

trait MoodleXmlImporter:
  def convert(questions: String, user: User): Seq[Question]
