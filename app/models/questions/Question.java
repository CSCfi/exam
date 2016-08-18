package models.questions;

import com.avaje.ebean.annotation.EnumMapping;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.Attachment;
import models.ExamSectionQuestion;
import models.Tag;
import models.User;
import models.api.AttachmentContainer;
import models.base.OwnedModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

import javax.persistence.*;
import java.util.List;
import java.util.Set;

@Entity
public class Question extends OwnedModel implements AttachmentContainer {

    @EnumMapping(integerType = true, nameValuePairs = "MultipleChoiceQuestion=1, EssayQuestion=2, WeightedMultipleChoiceQuestion=3")
    public enum Type {
        MultipleChoiceQuestion, EssayQuestion, WeightedMultipleChoiceQuestion
    }

    @EnumMapping(integerType = true, nameValuePairs = "Points=1, Selection=2")
    public enum EvaluationType {
        Points, Selection
    }

    @Column
    private Type type;

    @Column
    private String question;

    @Column
    private boolean shared;

    @Column
    private String state;

    @Column
    private String defaultEvaluationCriteria;

    @Column
    private EvaluationType defaultEvaluationType;

    @Column
    private String defaultAnswerInstructions;

    @Column
    private Integer defaultMaxScore;

    @Column
    private Integer defaultExpectedWordCount;

    @ManyToOne
    private Question parent;

    @OneToMany(mappedBy = "parent")
    @JsonBackReference
    private List<Question> children;

    @OneToMany(mappedBy = "question")
    @JsonBackReference
    private Set<ExamSectionQuestion> examSectionQuestions;

    @OneToOne(cascade = CascadeType.ALL)
    private Attachment attachment;

    @OneToMany(cascade = {CascadeType.PERSIST, CascadeType.REMOVE}, mappedBy = "question")
    @JsonManagedReference
    private List<MultipleChoiceOption> options;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Tag> tags;

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(name = "question_owner", joinColumns = @JoinColumn(name = "question_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> questionOwners;

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

    public String getDefaultEvaluationCriteria() {
        return defaultEvaluationCriteria;
    }

    public void setDefaultEvaluationCriteria(String defaultEvaluationCriteria) {
        this.defaultEvaluationCriteria = defaultEvaluationCriteria;
    }

    public EvaluationType getDefaultEvaluationType() {
        return defaultEvaluationType;
    }

    public void setDefaultEvaluationType(EvaluationType defaultEvaluationType) {
        this.defaultEvaluationType = defaultEvaluationType;
    }

    public String getDefaultAnswerInstructions() {
        return defaultAnswerInstructions;
    }

    public void setDefaultAnswerInstructions(String defaultAnswerInstructions) {
        this.defaultAnswerInstructions = defaultAnswerInstructions;
    }

    public Integer getDefaultMaxScore() {
        return defaultMaxScore;
    }

    public void setDefaultMaxScore(Integer defaultMaxScore) {
        this.defaultMaxScore = defaultMaxScore;
    }

    public Integer getDefaultExpectedWordCount() {
        return defaultExpectedWordCount;
    }

    public void setDefaultExpectedWordCount(Integer defaultExpectedWordCount) {
        this.defaultExpectedWordCount = defaultExpectedWordCount;
    }

    public Question getParent() {
        return parent;
    }

    public void setParent(Question parent) {
        this.parent = parent;
    }

    @Override
    public Attachment getAttachment() {
        return attachment;
    }

    @Override
    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    public List<MultipleChoiceOption> getOptions() {
        return options;
    }

    public void setOptions(List<MultipleChoiceOption> options) {
        this.options = options;
    }

    public Set<ExamSectionQuestion> getExamSectionQuestions() {
        return examSectionQuestions;
    }

    public void setExamSectionQuestions(Set<ExamSectionQuestion> examSectionQuestions) {
        this.examSectionQuestions = examSectionQuestions;
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

    public Set<User> getQuestionOwners() {
        return questionOwners;
    }

    public void setQuestionOwners(Set<User> questionOwners) {
        this.questionOwners = questionOwners;
    }


    @Transient
    public String getValidationResult() {
        String reason = null;
        switch (type) {
            case EssayQuestion:
                break;
            case MultipleChoiceQuestion:
                if (options.size() < 2) {
                    reason = "sitnet_minimum_of_two_options_required";
                } else if (!hasCorrectOption()) {
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
    public Double getMaxDefaultScore() {
        switch (getType()) {
            case EssayQuestion:
                if (defaultEvaluationType == EvaluationType.Points) {
                    return defaultMaxScore == null ? 0 : defaultMaxScore.doubleValue();
                }
                break;
            case MultipleChoiceQuestion:
                return defaultMaxScore == null ? 0 : defaultMaxScore.doubleValue();
            case WeightedMultipleChoiceQuestion:
                return options.stream()
                        .map(MultipleChoiceOption::getDefaultScore)
                        .filter(score -> score != null && score > 0)
                        .reduce(0.0, (sum, x) -> sum += x);
        }
        return 0.0;
    }

    @Transient
    public Double getMinDefaultScore() {
        if (getType() == Type.WeightedMultipleChoiceQuestion) {
                return options.stream()
                        .map(MultipleChoiceOption::getDefaultScore)
                        .filter(score -> score != null && score < 0)
                        .reduce(0.0, (sum, x) -> sum += x);
        }
        return 0.0;
    }

    @Transient
    private boolean hasCorrectOption() {
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

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

    public Question copy() {
        Question question = new Question();
        BeanUtils.copyProperties(this, question, "id", "options", "tags", "children");
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
