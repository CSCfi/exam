// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package functional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.running;

import base.IntegrationTestCase;
import base.RunAsAdmin;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import miscellaneous.xml.MoodleXmlImporter;
import models.user.User;
import org.junit.Test;
import scala.jdk.javaapi.CollectionConverters;

public class MoodleImporterTest extends IntegrationTestCase {

    @Test
    @RunAsAdmin
    public void testImportEssayQuestion() throws IOException {
        String content = Files.readString(Path.of("test/resources/essay-quiz.xml"));
        User user = getLoggerUser();
        running(app, () -> {
            MoodleXmlImporter converter = app.injector().instanceOf(MoodleXmlImporter.class);
            var report = converter.convert(content, user);
            var questions = CollectionConverters.asJava(report._1);
            var errors = CollectionConverters.asJava(report._2);
            assertThat(questions).hasSize(1);
            assertThat(questions.getFirst().getTags()).hasSize(2);
            assertThat(errors).isEmpty();
        });
    }

    @Test
    @RunAsAdmin
    public void testImportEssayQuestionPlainText() throws IOException {
        String content = Files.readString(Path.of("test/resources/essay-quiz2.xml"));
        User user = getLoggerUser();
        running(app, () -> {
            MoodleXmlImporter converter = app.injector().instanceOf(MoodleXmlImporter.class);
            var report = converter.convert(content, user);
            var questions = CollectionConverters.asJava(report._1);
            var errors = CollectionConverters.asJava(report._2);
            assertThat(questions).hasSize(1);
            assertThat(questions.getFirst().getTags()).hasSize(2);
            assertThat(errors).isEmpty();
        });
    }

    @Test
    @RunAsAdmin
    public void testImportMultichoiceQuestion() throws IOException {
        String content = Files.readString(Path.of("test/resources/multichoice-quiz.xml"));
        User user = getLoggerUser();
        running(app, () -> {
            MoodleXmlImporter converter = app.injector().instanceOf(MoodleXmlImporter.class);
            var report = converter.convert(content, user);
            var questions = CollectionConverters.asJava(report._1);
            var errors = CollectionConverters.asJava(report._2);
            assertThat(questions).hasSize(1);
            assertThat(questions.getFirst().getOptions()).hasSize(4);
            assertThat(errors).isEmpty();
        });
    }

    @Test
    @RunAsAdmin
    public void testImportWeightedMultichoiceQuestion() throws IOException {
        String content = Files.readString(Path.of("test/resources/weighted-multichoice-quiz.xml"));
        User user = getLoggerUser();
        running(app, () -> {
            MoodleXmlImporter converter = app.injector().instanceOf(MoodleXmlImporter.class);
            var report = converter.convert(content, user);
            var questions = CollectionConverters.asJava(report._1);
            var errors = CollectionConverters.asJava(report._2);
            assertThat(questions).hasSize(1);
            assertThat(questions.getFirst().getOptions()).hasSize(4);
            assertThat(errors).isEmpty();
        });
    }
}
