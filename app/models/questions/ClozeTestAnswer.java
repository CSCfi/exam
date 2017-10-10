package models.questions;

import com.google.common.reflect.TypeToken;
import com.google.gson.Gson;
import models.ExamSectionQuestion;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.math.NumberUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Transient;
import java.lang.reflect.Type;
import java.util.Collections;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;

@Entity
public class ClozeTestAnswer extends GeneratedIdentityModel {

    private static final String CLOZE_SELECTOR = "span[cloze=true]";

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Transient
    private String question;

    @Transient
    private Score score;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getQuestion() {
        return question;
    }

    // This sets up the question so that it can be displayed to student;
    public void setQuestion(ExamSectionQuestion esq) {
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        Elements blanks = doc.select(CLOZE_SELECTOR);
        blanks.forEach(b -> {
            boolean isNumeric = isNumeric(b);
            StreamSupport.stream(b.attributes().spliterator(), false)
                    .filter(attr -> !attr.getKey().equals("id"))
                    .forEach(attr -> b.removeAttr(attr.getKey()));
            b.tagName("input");
            b.text("");
            b.attr("type", isNumeric ? "number" : "text");
            b.attr("class", "cloze-input");
            if (isNumeric) {
                b.attr("step", "any");
                // Should allow for using both comma and period as decimal separator
                b.attr( "lang", "en-150");
            }
        });
        this.question = doc.body().children().toString();
    }

    // This sets up the question so it can be displayed for review
    public void setQuestionWithResults(ExamSectionQuestion esq) {
        Map<String, String> answers = asMap(new Gson());
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        Elements blanks = doc.select(CLOZE_SELECTOR);
        score = new Score();
        blanks.forEach(b -> {
            boolean isNumeric = isNumeric(b);
            boolean isCorrectAnswer = isCorrectAnswer(b, answers);
            String precision = b.attr("precision");
            if (isCorrectAnswer) {
                score.correctAnswers++;
            } else {
                score.incorrectAnswers++;
            }
            StreamSupport.stream(b.attributes().spliterator(), false)
                    .filter(attr -> !attr.getKey().equals("id"))
                    .forEach(attr -> b.removeAttr(attr.getKey()));
            b.tagName("input");
            b.text("");
            b.attr("class", isCorrectAnswer ? "cloze-correct" : "cloze-incorrect");
            b.attr("type", isNumeric ? "number" : "text");
            if (isNumeric) {
                b.append("<span class=\"cloze-precision\">[&plusmn;" + precision + "]</span>");
            }
        });
        this.question = doc.body().children().toString();
    }

    public Score getScore(ExamSectionQuestion esq) {
        Map<String, String> answers = asMap(new Gson());
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        Elements blanks = doc.select(CLOZE_SELECTOR);
        Score score = new Score();
        blanks.forEach(b -> {
            boolean isCorrectAnswer = isCorrectAnswer(b, answers);
            if (isCorrectAnswer) {
                score.correctAnswers++;
            } else {
                score.incorrectAnswers++;
            }
        });
        return score;
    }

    private Map<String, String> asMap(Gson gson) {
        Type mapType = new TypeToken<Map<String, String>>(){}.getType();
        Map<String, String> map = gson.fromJson(answer, mapType);
        return map == null ? Collections.emptyMap() : map;
    }

    private boolean isNumeric(Element blank) {
        return Boolean.parseBoolean(blank.attr("numeric"));
    }

    private boolean isCorrectNumericAnswer(Element blank, Map<String, String> answers) {
        String key = blank.attr("id");
        if (!answers.containsKey(key)) {
            return false;
        }
        String answerText = answers.get(blank.attr("id"));
        answerText = answerText.trim();
        if (!NumberUtils.isParsable(answerText)) {
            return false;
        }
        String precisionAttr = blank.attr("precision");
        Double answer = Double.parseDouble(answerText);
        Double correctAnswer = Double.parseDouble(blank.text().trim());
        Double precision = precisionAttr == null ? 0.0 : Double.parseDouble(precisionAttr);
        return correctAnswer - precision <= answer && answer <= correctAnswer + precision;
    }

    private boolean isCorrectAnswer(Element blank, Map<String, String> answers) {
        if (isNumeric(blank)) {
            return isCorrectNumericAnswer(blank, answers);
        }
        String answer;
        String attr = blank.attr("id");
        if (answers.containsKey(attr)) {
            answer = answers.get(blank.attr("id"));
        } else {
            answer = "";
        }
        // Get rid of excess whitespace
        answer = answer.trim().replaceAll(" +", " ");
        String correctAnswer = blank.text().trim()
                .replaceAll(" +", " ")
                .replaceAll(" \\|", "|")
                .replaceAll("\\| ", "|");
        // Generate the regex pattern. Replace '*' with '.*' and put the whole
        // thing in braces if there's a '|'.
        // For escaped '\*' and '\|' we have to first replace occurrences with special
        // escape sequence until restoring them in the regex.
        final String ESC = "__!ESC__";
        String regex = correctAnswer
                .replace("\\*", ESC)
                .replace("*", ".*")
                .replace(ESC, "\\*")
                .replace("\\|", ESC);

        if (regex.contains("|")) {
            regex = String.format("(%s)", regex);
        }
        regex = regex.replace(ESC, "\\|");
        boolean isCaseSensitive = Boolean.parseBoolean(blank.attr("case-sensitive"));
        Pattern pattern = Pattern.compile(regex, isCaseSensitive ? 0 : Pattern.CASE_INSENSITIVE);
        return pattern.matcher(answer).matches();
    }

    // DTO
    public class Score {
        int correctAnswers;
        int incorrectAnswers;

        public int getCorrectAnswers() {
            return correctAnswers;
        }
        public int getIncorrectAnswers() {
            return incorrectAnswers;
        }
    }

}
