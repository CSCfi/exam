package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import io.ebean.annotation.EnumValue;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;


@Entity
public class AutoEvaluationConfig extends GeneratedIdentityModel {

    public enum ReleaseType  {
        @EnumValue("1") IMMEDIATE,
        @EnumValue("2") GIVEN_DATE,
        @EnumValue("3") GIVEN_AMOUNT_DAYS,
        @EnumValue("4") AFTER_EXAM_PERIOD,
        @EnumValue("5") NEVER
    }

    private ReleaseType releaseType;

    @OneToOne
    @JsonBackReference
    private Exam exam;

    @Temporal(TemporalType.TIMESTAMP)
    private Date releaseDate;

    private Integer amountDays;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "autoEvaluationConfig")
    private Set<GradeEvaluation> gradeEvaluations;

    public ReleaseType getReleaseType() {
        return releaseType;
    }

    public void setReleaseType(ReleaseType releaseType) {
        this.releaseType = releaseType;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public Date getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(Date releaseDate) {
        this.releaseDate = releaseDate;
    }

    public Integer getAmountDays() {
        return amountDays;
    }

    public void setAmountDays(Integer amountDays) {
        this.amountDays = amountDays;
    }

    public Set<GradeEvaluation> getGradeEvaluations() {
        return gradeEvaluations;
    }

    public void setGradeEvaluations(Set<GradeEvaluation> gradeEvaluations) {
        this.gradeEvaluations = gradeEvaluations;
    }

    @Transient
    public Map<Integer, GradeEvaluation> asGradeMap() {
        return gradeEvaluations.stream()
                .collect(Collectors.toMap(ge -> ge.getGrade().getId(), Function.identity()));
    }

    @Transient
    public AutoEvaluationConfig copy() {
        AutoEvaluationConfig clone = new AutoEvaluationConfig();
        BeanUtils.copyProperties(this, clone, "id", "exam", "gradeEvaluations");
        for (GradeEvaluation ge : gradeEvaluations) {
            clone.getGradeEvaluations().add(ge.copy());
        }
        return clone;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof AutoEvaluationConfig)) {
            return false;
        }
        AutoEvaluationConfig otherEvaluation = (AutoEvaluationConfig) other;
        return new EqualsBuilder().append(id, otherEvaluation.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

}
