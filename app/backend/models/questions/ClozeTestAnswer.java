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

import backend.models.ExamSectionQuestion;
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

    private void setQuestionWithResults(Document doc) {
        Map<String, String> answers = asMap(new Gson());
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
            Iterator<Attribute> it = b.attributes().iterator();
            while (it.hasNext()) {
                Attribute a = it.next();
                if (!a.getKey().equals("id")) {
                    it.remove();
                }
            }
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

    // This sets up the question so it can be displayed for review
    public void setQuestionWithResults(JsonNode esq) {
        Document doc = Jsoup.parse(esq.get("question").get("question").asText());
        setQuestionWithResults(doc);
    }

    // This sets up the question so it can be displayed for review
    public void setQuestionWithResults(ExamSectionQuestion esq) {
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        setQuestionWithResults(doc);
    }

    public Score calculateScore(ExamSectionQuestion esq) {
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
        Type mapType = new TypeToken<Map<String, String>>() {/* pass */}.getType();
        Map<String, String> map = gson.fromJson(answer, mapType);
        return map == null ? Collections.emptyMap() : map;
    }

    private boolean isNumeric(Element blank) {
        return Boolean.parseBoolean(blank.attr("numeric"));
    }

    private boolean isCorrectNumericAnswer(Element blank, Map<String, String> answers) {
        String key = blank.attr("id");
        if (!answers.containsKey(key) || answers.get(key) == null) {
            return false;
        }
        String answerText = answers.get(key);
        answerText = answerText.trim();
        if (!NumberUtils.isParsable(answerText)) {
            return false;
        }
        String precisionAttr = blank.attr("precision");
        double answer = Double.parseDouble(answerText);
        Double correctAnswer = Double.parseDouble(blank.text().trim());
        Double precision = precisionAttr == null ? 0.0 : Double.parseDouble(precisionAttr);
        return correctAnswer - precision <= answer && answer <= correctAnswer + precision;
    }

    private String escapeSpecialRegexChars(String input) {
        return SPECIAL_REGEX_CHARS.matcher(input).replaceAll("\\\\$0");
    }

    private boolean isCorrectAnswer(Element blank, Map<String, String> answers) {
        if (isNumeric(blank)) {
            return isCorrectNumericAnswer(blank, answers);
        }
        String answer = answers.getOrDefault(blank.attr("id"), "");
        // Get rid of excess whitespace
        answer = answer == null ? "" : answer.trim()
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
