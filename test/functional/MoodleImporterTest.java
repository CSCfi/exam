package functional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.running;

import base.IntegrationTestCase;
import base.RunAsAdmin;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import models.User;
import models.questions.Question;
import org.junit.Test;
import scala.jdk.javaapi.CollectionConverters;
import util.xml.MoodleXmlImporter;

public class MoodleImporterTest extends IntegrationTestCase {

    @Test
    @RunAsAdmin
    public void testImportEssayQuestion() throws IOException {
        String content = Files.readString(Path.of("test/resources/essay-quiz.xml"));
        User user = getLoggerUser();
        running(app, () -> {
            MoodleXmlImporter converter = app.injector().instanceOf(MoodleXmlImporter.class);
            List<Question> questions = CollectionConverters.asJava(converter.convert(content, user));
            assertThat(questions).hasSize(1);
            assertThat(questions.get(0).getTags()).hasSize(2);
        });
    }

    @Test
    @RunAsAdmin
    public void testImportMultichoiceQuestion() throws IOException {
        String content = Files.readString(Path.of("test/resources/multichoice-quiz.xml"));
        User user = getLoggerUser();
        running(app, () -> {
            MoodleXmlImporter converter = app.injector().instanceOf(MoodleXmlImporter.class);
            List<Question> questions = CollectionConverters.asJava(converter.convert(content, user));
            assertThat(questions).hasSize(1);
            assertThat(questions.get(0).getOptions()).hasSize(4);
        });
    }

    @Test
    @RunAsAdmin
    public void testImportWeightedMultichoiceQuestion() throws IOException {
        String content = Files.readString(Path.of("test/resources/weighted-multichoice-quiz.xml"));
        User user = getLoggerUser();
        running(app, () -> {
            MoodleXmlImporter converter = app.injector().instanceOf(MoodleXmlImporter.class);
            List<Question> questions = CollectionConverters.asJava(converter.convert(content, user));
            assertThat(questions).hasSize(1);
            assertThat(questions.get(0).getOptions()).hasSize(4);
        });
    }
}
