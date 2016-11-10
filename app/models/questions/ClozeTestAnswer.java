package models.questions;

import models.ExamSectionQuestion;
import models.base.GeneratedIdentityModel;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Transient;
import java.util.stream.StreamSupport;

@Entity
public class ClozeTestAnswer extends GeneratedIdentityModel {

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Transient
    private String question;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(ExamSectionQuestion esq) {
        Document doc = Jsoup.parse(esq.getQuestion().getQuestion());
        Elements answers = doc.select("span[cloze=true]");
        answers.forEach(a -> {
            StreamSupport.stream(a.attributes().spliterator(), false)
                    .filter(attr -> !attr.getKey().equals("id"))
                    .forEach(attr -> a.removeAttr(attr.getKey()));
            a.tagName("input");
            a.text("");
            a.attr("type", "text");
        });
        this.question = doc.body().children().toString();
    }

}
