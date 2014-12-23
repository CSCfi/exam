package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.questions.AbstractQuestion;
import play.db.ebean.Model;

import javax.persistence.*;

@Entity
@IdClass(ExamSectionQuestionPK.class)
public class ExamSectionQuestion extends Model {

    @EmbeddedId
    private ExamSectionQuestionPK pk = new ExamSectionQuestionPK();

    @ManyToOne
    @JoinColumn(name="exam_section_id", insertable = false, updatable = false)
    @JsonBackReference
    private ExamSection examSection;

    @ManyToOne(cascade=CascadeType.ALL)
    @JoinColumn(name="question_id", insertable = false, updatable = false)
    private AbstractQuestion question;

    @Column
    private int sequenceNumber;

    public ExamSectionQuestion() {

    }

    public ExamSectionQuestion(ExamSection section, AbstractQuestion question) {
        this.examSection = section;
        this.question = question;

        this.pk.setExamSectionId(section.getId());
        this.pk.setQuestionId(question.getId());

        section.getSectionQuestions().add(this);
    }

    public ExamSection getExamSection() {
        return examSection;
    }

    public void setExamSection(ExamSection examSection) {
        this.examSection = examSection;
    }

    public AbstractQuestion getQuestion() {
        return question;
    }

    public void setQuestion(AbstractQuestion question) {
        this.question = question;
    }

    public int getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(int sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof ExamSectionQuestion)) {
            return false;
        }
        ExamSectionQuestion that = (ExamSectionQuestion) o;
        return pk.equals(that.pk);
    }

    @Override
    public int hashCode() {
        int result = super.hashCode();
        result = 31 * result + (pk != null ? pk.hashCode() : 0);
        return result;
    }
}
