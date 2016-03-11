package models;

import com.avaje.ebean.annotation.EnumMapping;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

import javax.persistence.*;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;


@Entity
public class AutoEvaluationConfig extends GeneratedIdentityModel {

    @EnumMapping(integerType = true, nameValuePairs =
            "IMMEDIATE=1, GIVEN_DATE=2, GIVEN_AMOUNT_DAYS=3, AFTER_EXAM_PERIOD=4, NEVER=5")
    public enum ReleaseType  {
        IMMEDIATE,
        GIVEN_DATE,
        GIVEN_AMOUNT_DAYS,
        AFTER_EXAM_PERIOD,
        NEVER
    }

    private ReleaseType releaseType;

    @OneToOne
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
