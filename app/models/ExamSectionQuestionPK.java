package models;

import javax.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public class ExamSectionQuestionPK implements Serializable {

    private Long examSectionId;
    private Long questionId;

    public Long getExamSectionId() {
        return examSectionId;
    }

    public void setExamSectionId(Long examSectionId) {
        this.examSectionId = examSectionId;
    }

    public Long getQuestionId() {
        return questionId;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public int hashCode() {
        return (int) (examSectionId + questionId);
    }

    public boolean equals(Object object) {
        if (object instanceof ExamSectionQuestionPK) {
            ExamSectionQuestionPK otherPk = (ExamSectionQuestionPK) object;
            return otherPk.getExamSectionId().equals(getExamSectionId()) &&
                    otherPk.getQuestionId().equals(getQuestionId());
        }
        return false;
    }
}
