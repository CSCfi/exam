// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package functional

import base.BaseIntegrationSpec
import services.xml.MoodleXmlImporter

import java.nio.file.{Files, Path}

class MoodleImporterSpec extends BaseIntegrationSpec:

  private lazy val moodleXmlImporter = app.injector.instanceOf(classOf[MoodleXmlImporter])

  "MoodleXmlImporter" when:
    "importing essay questions" should:
      "import essay question successfully" in:
        val (user, session) = runIO(loginAsAdmin())
        val content         = Files.readString(Path.of("test/resources/essay-quiz.xml"))

        val report    = moodleXmlImporter.convert(content, user)
        val questions = report._1
        val errors    = report._2

        questions must have size 1
        questions.head.getTags must have size 2
        errors must be(empty)

      "import essay question with plain text successfully" in:
        val (user, session) = runIO(loginAsAdmin())
        val content         = Files.readString(Path.of("test/resources/essay-quiz2.xml"))

        val report    = moodleXmlImporter.convert(content, user)
        val questions = report._1
        val errors    = report._2

        questions must have size 1
        questions.head.getTags must have size 2
        errors must be(empty)

    "importing multiple choice questions" should:
      "import multichoice question successfully" in:
        val (user, session) = runIO(loginAsAdmin())
        val content         = Files.readString(Path.of("test/resources/multichoice-quiz.xml"))

        val report    = moodleXmlImporter.convert(content, user)
        val questions = report._1
        val errors    = report._2

        questions must have size 1
        questions.head.getOptions must have size 4
        errors must be(empty)

      "import weighted multichoice question successfully" in:
        val (user, session) = runIO(loginAsAdmin())
        val content = Files.readString(Path.of("test/resources/weighted-multichoice-quiz.xml"))

        val report    = moodleXmlImporter.convert(content, user)
        val questions = report._1
        val errors    = report._2

        questions must have size 1
        questions.head.getOptions must have size 4
        errors must be(empty)
