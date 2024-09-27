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

package models.questions;

import com.fasterxml.jackson.databind.JsonNode;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Transient;
import java.lang.reflect.Type;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import models.base.GeneratedIdentityModel;
import models.sections.ExamSectionQuestion;
import org.apache.commons.lang3.math.NumberUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

@Entity
public class ClozeTestAnswer extends GeneratedIdentityModel {

    private static final String CLOZE_SELECTOR = "span[cloze=true]";

    private static final Pattern SPECIAL_REGEX_CHARS = Pattern.compile("[{}()\\[\\].+?^$\\\\/]");

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
            b.attr("aria-label", "cloze test answer");
            b.attr("type", isNumeric ? "number" : "text");
            b.attr("class", "cloze-input mt-2");
            if (isNumeric) {
                b.attr("step", "any");
                // Hacky, but this should allow for using both comma and period as decimal separator even in Firefox
                // regardless of browser language.
                b.attr("lang", "fi");
            }
        });
        this.question = doc.body().children().toString();
    }

    private void setQuestionWithResults(Document doc, String blankAnswerText, boolean showCorrect) {
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
            if (showCorrect) {
                b.attr("class", isCorrectAnswer ? "cloze-correct" : "cloze-incorrect");
            } else {
                b.attr("class", "cloze-neutral");
            }
            if (isNumeric) {
                b.after("<span class=\"cloze-precision\">[&plusmn;" + precision + "]</span>");
            }
        });
        this.question = doc.body().children().toString();
    }

    // This sets up the question, so it can be displayed for review
    public void setQuestionWithResults(JsonNode esq, String blankAnswerText) {
        Document doc = Jsoup.parse(esq.get("question").get("question").asText());
        setQuestionWithResults(doc, blankAnswerText, true);
    }

    // This sets up the question, so it can be displayed for review
    public void setQuestionWithResults(ExamSectionQuestion esq, String blankAnswerText, boolean showCorrect) {
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        setQuestionWithResults(doc, blankAnswerText, showCorrect);
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
        Type mapType = new TypeToken<Map<String, String>>() {}.getType();
        Map<String, String> map = gson.fromJson(answer, mapType);
        if (map != null) {
            map.values().removeIf(Objects::isNull);
            return map;
        }
        return Collections.emptyMap();
    }

    private boolean isNumeric(Element blank) {
        return Boolean.parseBoolean(blank.attr("numeric"));
    }

    private boolean isCorrectNumericAnswer(Element blank, String rawAnswer) {
        if (rawAnswer.isBlank()) {
            return false;
        }
        String answerText = rawAnswer.trim();
        if (!NumberUtils.isParsable(answerText)) {
            return false;
        }
        String precisionAttr = blank.attr("precision");
        double answer = Double.parseDouble(answerText);
        Double correctAnswer = Double.parseDouble(blank.text().trim().replaceAll("(^\\h*)|(\\h*$)", ""));
        Double precision = precisionAttr.isEmpty() ? 0.0 : Double.parseDouble(precisionAttr);
        return (correctAnswer - precision <= answer && answer <= correctAnswer + precision);
    }

    private String escapeSpecialRegexChars(String input) {
        return SPECIAL_REGEX_CHARS.matcher(input).replaceAll("\\\\$0");
    }

    private boolean isCorrectAnswer(Element blank, String rawAnswer) {
        if (isNumeric(blank)) {
            return isCorrectNumericAnswer(blank, rawAnswer);
        }
        // Get rid of excess whitespace
        String answer = rawAnswer.trim().replaceAll(" +", " ");
        String correctAnswer = blank
            .text()
            .trim()
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
    public static class Score {

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
