/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.models.questions;

import java.lang.reflect.Type;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.regex.Pattern;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Transient;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.gson.reflect.TypeToken;
import com.google.gson.Gson;
import org.apache.commons.lang3.math.NumberUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import backend.models.sections.ExamSectionQuestion;
import backend.models.base.GeneratedIdentityModel;

@Entity
public class ClozeTestAnswer extends GeneratedIdentityModel {

    private static final String CLOZE_SELECTOR = "span[cloze=true]";

    private static final Pattern SPECIAL_REGEX_CHARS = Pattern.compile("[{}()\\[\\].+?^$\\\\]");

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

    public Score getScore() {
        return score;
    }

    public ClozeTestAnswer copy() {
        ClozeTestAnswer clozeTestAnswer = new ClozeTestAnswer();
        clozeTestAnswer.setAnswer(answer);
        clozeTestAnswer.save();
        return clozeTestAnswer;
    }

    // This sets up the question so that it can be displayed to student
    public void setQuestion(ExamSectionQuestion esq) {
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        Elements blanks = doc.select(CLOZE_SELECTOR);
        blanks.forEach(b -> {
            boolean isNumeric = isNumeric(b);
            Iterator<Attribute> it = b.attributes().iterator();
            while (it.hasNext()) {
                Attribute a = it.next();
                if (!a.getKey().equals("id")) {
                    it.remove();
                }
            }
            b.tagName("input");
            b.text("");
            b.attr("aria-label", "cloze test question");
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

    private void setQuestionWithResults(Document doc, String blankAnswerText) {
        Map<String, String> answers = asMap(new Gson());
        Elements blanks = doc.select(CLOZE_SELECTOR);
        score = new Score();
        blanks.forEach(b -> {
            boolean isNumeric = isNumeric(b);
            String answer = answers.getOrDefault(b.attr("id"), "");
            boolean isCorrectAnswer = isCorrectAnswer(b, answer);
            String precision = b.attr("precision");
            if (isCorrectAnswer) {
                score.correctAnswers++;
            } else {
                score.incorrectAnswers++;
            }
            Iterator<Attribute> it = b.attributes().iterator();
            while (it.hasNext()) {
                    it.next();
                    it.remove();
            }
            b.text("");
            b.append(answer.isBlank() ? String.format("<em>%s</em>", blankAnswerText) : answer);
            b.attr("class", isCorrectAnswer ? "cloze-correct" : "cloze-incorrect");
            if (isNumeric) {
                b.after("<span class=\"cloze-precision\">[&plusmn;" + precision + "]</span>");
            }
        });
        this.question = doc.body().children().toString();
    }

    // This sets up the question so it can be displayed for review
    public void setQuestionWithResults(JsonNode esq, String blankAnswerText) {
        Document doc = Jsoup.parse(esq.get("question").get("question").asText());
        setQuestionWithResults(doc, blankAnswerText);
    }

    // This sets up the question so it can be displayed for review
    public void setQuestionWithResults(ExamSectionQuestion esq, String blankAnswerText) {
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        setQuestionWithResults(doc, blankAnswerText);
    }

    public Score calculateScore(ExamSectionQuestion esq) {
        Map<String, String> answers = asMap(new Gson());
        if (esq.getQuestion().getQuestion() == null) {
            return new Score();
        }
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        Elements blanks = doc.select(CLOZE_SELECTOR);
        Score score = new Score();
        blanks.forEach(b -> {
            String answer = answers.getOrDefault(b.attr("id"), "");
            boolean isCorrectAnswer = isCorrectAnswer(b, answer);
            if (isCorrectAnswer) {
                score.correctAnswers++;
            } else {
                score.incorrectAnswers++;
            }
        });
        return score;
    }

    private Map<String, String> asMap(Gson gson) {
        Type mapType = new TypeToken<Map<String, String>>() {/* pass */}.getType();
        Map<String, String> map = gson.fromJson(answer, mapType);
        return map == null ? Collections.emptyMap() : map;
    }

    private boolean isNumeric(Element blank) {
        return Boolean.parseBoolean(blank.attr("numeric"));
    }

    private boolean isCorrectNumericAnswer(Element blank, String rawAnswer) {
        String key = blank.attr("id");
        if (rawAnswer.isBlank()) {
            return false;
        }
        String answerText = rawAnswer.trim();
        if (!NumberUtils.isParsable(answerText)) {
            return false;
        }
        String precisionAttr = blank.attr("precision");
        double answer = Double.parseDouble(answerText);
        Double correctAnswer = Double.parseDouble(blank.text().trim().replaceAll("(^\\h*)|(\\h*$)",""));
        Double precision = precisionAttr == null ? 0.0 : Double.parseDouble(precisionAttr);
        return correctAnswer - precision <= answer && answer <= correctAnswer + precision;
    }

    private String escapeSpecialRegexChars(String input) {
        return SPECIAL_REGEX_CHARS.matcher(input).replaceAll("\\\\$0");
    }

    private boolean isCorrectAnswer(Element blank, String rawAnswer) {
        if (isNumeric(blank)) {
            return isCorrectNumericAnswer(blank, rawAnswer);
        }
        // Get rid of excess whitespace
        String answer = rawAnswer == null ? "" : rawAnswer.trim()
                .replaceAll(" +", " ");
        String correctAnswer = blank.text().trim()
                .replaceAll(" +", " ")
                .replaceAll(" \\|", "|")
                .replaceAll("\\| ", "|");
        // Generate the regex pattern. Replace '*' with '.*' and put the whole
        // thing in braces if there's a '|'.
        // For escaped '\*' and '\|' we have to first replace occurrences with special
        // escape sequence until restoring them in the regex.
        final String ESC = "__!ESC__";
        String regex = escapeSpecialRegexChars(correctAnswer)
        // Also backlashes will be escaped on escapeSpecialRegexChars call, therefore '\\*' pattern needs to be replaced
                .replaceAll("\\Q\\\\*\\E", ESC)
                .replace("*", ".*")
                .replace(ESC, "\\*")
                .replaceAll("\\Q\\\\|\\E", ESC);

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
