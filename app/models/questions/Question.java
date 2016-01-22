package models.questions;

import com.avaje.ebean.annotation.EnumMapping;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.Attachment;
import models.ExamSectionQuestion;
import models.OwnedModel;
import models.Tag;
import models.api.AttachmentContainer;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.springframework.beans.BeanUtils;

import javax.persistence.*;
import java.util.List;

@Entity
public class Question extends OwnedModel implements AttachmentContainer, Scorable {

    @EnumMapping(integerType = true, nameValuePairs = "MultipleChoiceQuestion=1, EssayQuestion=2, WeightedMultipleChoiceQuestion=3")
    public enum Type {
        MultipleChoiceQuestion, EssayQuestion, WeightedMultipleChoiceQuestion
    }

    @Column
    protected Type type;

    @Column(columnDefinition = "TEXT")
    protected String question;

    protected boolean shared;

    @Column(columnDefinition = "TEXT")
    protected String instruction;

    protected String state;

    @Column(columnDefinition = "numeric default 0")
    protected Double maxScore = 0.0;

    @Column(columnDefinition = "numeric default 0")
    protected Double evaluatedScore;

    @ManyToOne(cascade = CascadeType.PERSIST) // do not delete parent question
    protected Question parent;

    @OneToMany(mappedBy = "parent")
    @JsonBackReference
    protected List<Question> children;

    @OneToOne(cascade = CascadeType.ALL)
    protected Answer answer;

    @Column(columnDefinition = "TEXT")
    protected String evaluationCriterias;

    @OneToOne(mappedBy = "question")
    @JsonBackReference
    protected ExamSectionQuestion examSectionQuestion;

    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    protected boolean expanded;

    // not really max length, Just a recommendation
    private Long maxCharacters;

    // Points, Select
    private String evaluationType;

    @OneToMany(cascade = {CascadeType.PERSIST, CascadeType.REMOVE}, mappedBy = "question")
    @JsonManagedReference
    private List<MultipleChoiceOption> options;


    @ManyToMany(cascade = CascadeType.ALL)
    protected List<Tag> tags;


    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public boolean isShared() {
        return shared;
    }

    public void setShared(boolean shared) {
        this.shared = shared;
    }

    public String getInstruction() {
        return instruction;
    }

    public void setInstruction(String instruction) {
        this.instruction = instruction;
    }

    public Question getParent() {
        return parent;
    }

    public void setParent(Question parent) {
        this.parent = parent;
    }

    public Answer getAnswer() {
        return answer;
    }

    public void setAnswer(Answer answer) {
        this.answer = answer;
    }

    public String getEvaluationCriterias() {
        return evaluationCriterias;
    }

    public void setEvaluationCriterias(String evaluationCriterias) {
        this.evaluationCriterias = evaluationCriterias;
    }

    @Override
    public Attachment getAttachment() {
        return attachment;
    }

    @Override
    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public Double getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(Double maxScore) {
        this.maxScore = maxScore;
    }

    public List<MultipleChoiceOption> getOptions() {
        return options;
    }

    public void setOptions(List<MultipleChoiceOption> options) {
        this.options = options;
    }

    public Double getEvaluatedScore() {
        return evaluatedScore;
    }

    public void setEvaluatedScore(Double evaluatedScore) {
        this.evaluatedScore = evaluatedScore;
    }

    public ExamSectionQuestion getExamSectionQuestion() {
        return examSectionQuestion;
    }

    public void setExamSectionQuestion(ExamSectionQuestion examSectionQuestion) {
        this.examSectionQuestion = examSectionQuestion;
    }

    public Long getMaxCharacters() {
        return maxCharacters;
    }

    public void setMaxCharacters(Long maxCharacters) {
        this.maxCharacters = maxCharacters;
    }

    public String getEvaluationType() {
        return evaluationType;
    }

    public void setEvaluationType(String evaluationType) {
        this.evaluationType = evaluationType;
    }

    public List<Question> getChildren() {
        return children;
    }

    public void setChildren(List<Question> children) {
        this.children = children;
    }

    public List<Tag> getTags() {
        return tags;
    }

    public void setTags(List<Tag> tags) {
        this.tags = tags;
    }

    @Transient
    @Override
    public Double getAssessedScore() {
        switch (type) {
            case EssayQuestion:
                if (evaluationType != null && evaluationType.equals("Points")) {
                    return evaluatedScore;
                }
                break;
            case MultipleChoiceQuestion:
                if (answer != null) {
                    return answer.getOptions().get(0).isCorrectOption() ? maxScore : 0.0;
                }
                break;
            case WeightedMultipleChoiceQuestion:
                if (answer != null) {
                    Double evaluation = answer.getOptions().stream()
                            .map(MultipleChoiceOption::getScore)
                            .reduce(0.0, (sum, x) -> sum += x);
                    // ATM minimum score is zero
                    return Math.max(0.0, evaluation);
                }
                break;
        }
        return 0.0;
    }

    @Transient
    @Override
    public Double getMaxAssessedScore() {
        switch (type) {
            case EssayQuestion:
                if (evaluationType != null && evaluationType.equals("Points")) {
                    return maxScore;
                }
                break;
            case MultipleChoiceQuestion:
                return maxScore;
            case WeightedMultipleChoiceQuestion:
                return options.stream()
                        .map(MultipleChoiceOption::getScore)
                        .filter(o -> o > 0)
                        .reduce(0.0, (sum, x) -> sum += x);
        }
        return 0.0;
    }

    @Transient
    @Override
    public boolean isRejected() {
        return type == Type.EssayQuestion &&
                evaluationType != null &&
                evaluationType.equals("Select")
                && evaluatedScore != null
                && evaluatedScore == 0;
    }

    @Transient
    @Override
    public boolean isApproved() {
        return type == Type.EssayQuestion &&
                evaluationType != null &&
                evaluationType.equals("Select")
                && evaluatedScore != null
                && evaluatedScore == 1;
    }

    @Transient
    @Override
    public String validate() {
        String reason = null;
        switch (type) {
            case EssayQuestion:
                break;
            case MultipleChoiceQuestion:
                if (options.size() < 2) {
                    reason = "sitnet_minimum_of_two_options_required";
                }
                else if (!hasCorrectOption()) {
                    reason = "sitnet_correct_option_required";
                }
                break;
            case WeightedMultipleChoiceQuestion:
                if (options.size() < 2) {
                    reason = "sitnet_minimum_of_two_options_required";
                }
                break;
            default:
                reason = "unknown question type";
        }
        return reason;
    }

    @Transient
    public boolean hasCorrectOption() {
        return options.stream().anyMatch(MultipleChoiceOption::isCorrectOption);
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof Question)) {
            return false;
        }
        Question other = (Question) object;
        return new EqualsBuilder().append(id, other.getId()).build();
    }

    public Question copy() {
        Question question = new Question();
        BeanUtils.copyProperties(this, question, "id", "answer", "options", "tags", "children");
        question.setParent(this);
        for (MultipleChoiceOption o : options) {
            question.getOptions().add(o.copy());
        }
        if (attachment != null) {
            Attachment copy = new Attachment();
            BeanUtils.copyProperties(attachment, copy, "id");
            question.setAttachment(copy);
        }
        return question;
    }

    @Override
    public String toString() {
        return "Question [type=" + type
                + ", id=" + id + "]";
    }

}
