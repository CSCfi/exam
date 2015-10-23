package models;

import com.avaje.ebean.Model;
import com.fasterxml.jackson.annotation.JsonBackReference;
import models.questions.Question;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

import javax.annotation.Nonnull;
import javax.persistence.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"exam_section_id", "question_id"}))
public class ExamSectionQuestion extends Model implements Comparable<ExamSectionQuestion> {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "exam_section_id")
    @JsonBackReference
    private ExamSection examSection;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "question_id")
    private Question question;

    @Column
    private int sequenceNumber;

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

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public int getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(int sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    public ExamSectionQuestion copy(boolean usePrototypeQuestion) {
        ExamSectionQuestion esq = new ExamSectionQuestion();
        BeanUtils.copyProperties(this, esq, "id");
        Question blueprint = question.copy();
        if (usePrototypeQuestion) {
            blueprint.setParent(question.getParent());
        }
        esq.setQuestion(blueprint);
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
        ExamSectionQuestion other = (ExamSectionQuestion) o;
        return new EqualsBuilder().append(getExamSection(), other.getExamSection())
                .append(getQuestion(), other.getQuestion()).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(getExamSection()).append(getQuestion()).build();
    }

    @Override
    public int compareTo(@Nonnull ExamSectionQuestion o) {
        return sequenceNumber - o.sequenceNumber;
    }
}
