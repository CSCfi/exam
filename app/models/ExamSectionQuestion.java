package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.questions.AbstractQuestion;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;
import play.db.ebean.Model;

import javax.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"exam_section_id", "question_id"}))
public class ExamSectionQuestion extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "exam_section_id")
    @JsonBackReference
    private ExamSection examSection;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "question_id")
    private AbstractQuestion question;

    @Column
    private int sequenceNumber;

    public ExamSectionQuestion() {

    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public ExamSectionQuestion copy() {
        ExamSectionQuestion esq = new ExamSectionQuestion();
        BeanUtils.copyProperties(this, esq, "id");
        esq.setQuestion(question.copy());
        return esq;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof ExamSectionQuestion)) {
            return false;
        }
        ExamSectionQuestion other = (ExamSectionQuestion)o;
        return new EqualsBuilder().append(getExamSection(), other.getExamSection())
                .append(getQuestion(), other.getQuestion()).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(getExamSection()).append(getQuestion()).build();
    }
}
