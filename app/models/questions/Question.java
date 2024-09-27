// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.annotation.EnumValue;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import models.Attachment;
import models.Tag;
import models.User;
import models.api.AttachmentContainer;
import models.base.OwnedModel;
import models.sections.ExamSectionQuestion;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.math.NumberUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.BeanUtils;
import play.mvc.Result;
import play.mvc.Results;
import sanitizers.SanitizingHelper;

@Entity
public class Question extends OwnedModel implements AttachmentContainer {

    public enum Type {
        @EnumValue("1")
        MultipleChoiceQuestion,
        @EnumValue("2")
        EssayQuestion,
        @EnumValue("3")
        WeightedMultipleChoiceQuestion,
        @EnumValue("4")
        ClozeTestQuestion,
        @EnumValue("5")
        ClaimChoiceQuestion,
    }

    public enum EvaluationType {
        @EnumValue("1")
        Points,
        @EnumValue("2")
        Selection,
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
    private Double defaultMaxScore;

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

    @OneToMany(cascade = { CascadeType.PERSIST, CascadeType.REMOVE }, mappedBy = "question")
    @JsonManagedReference
    private List<MultipleChoiceOption> options;

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "question_tag",
        joinColumns = @JoinColumn(name = "question_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private List<Tag> tags;

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "question_owner",
        joinColumns = @JoinColumn(name = "question_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
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

    public Double getDefaultMaxScore() {
        return defaultMaxScore;
    }

    public void setDefaultMaxScore(Double defaultMaxScore) {
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

    private boolean nodeExists(JsonNode node, String name) {
        return node.get(name) != null && !node.get(name).isNull();
    }

    private String getClozeTestQuestionContentValidationResult(JsonNode node) {
        String reason = null;
        String questionText = node.get("question").asText();
        if (!questionText.contains("cloze=\"true\"")) {
            reason = "no embedded answers";
        } else {
            Document doc = Jsoup.parse(questionText);
            Elements answers = doc.select("span[cloze=true]");
            Set<String> distinctIds = answers.stream().map(a -> a.attr("id")).collect(Collectors.toSet());
            if (answers.size() != distinctIds.size()) {
                reason = "duplicate ids found";
            } else if (
                answers.stream().map(a -> a.attr("precision")).anyMatch(p -> p.isEmpty() || !NumberUtils.isParsable(p))
            ) {
                reason = "invalid precision found";
            } else if (
                answers
                    .stream()
                    .filter(a -> a.attr("numeric").equals("true"))
                    .map(Element::text)
                    .anyMatch(t -> !NumberUtils.isParsable(t))
            ) {
                reason = "non-numeric correct answer for numeric question";
            }
        }
        return reason;
    }

    private boolean getClaimChoiceOptionsValidationResult(ArrayNode options) {
        // Check that all required option conditions are met, discarding possible duplicates
        return (
            StreamSupport
                .stream(options.spliterator(), false)
                .filter(n -> {
                    MultipleChoiceOption.ClaimChoiceOptionType type = SanitizingHelper
                        .parseEnum("claimChoiceType", n, MultipleChoiceOption.ClaimChoiceOptionType.class)
                        .orElse(null);
                    double defaultScore = n.get("defaultScore").asDouble();
                    String option = n.get("option").asText();

                    if (type == null) {
                        return false;
                    }

                    return (
                        (type == MultipleChoiceOption.ClaimChoiceOptionType.CorrectOption &&
                            defaultScore > 0 &&
                            !option.isEmpty()) ||
                        (type == MultipleChoiceOption.ClaimChoiceOptionType.IncorrectOption &&
                            defaultScore <= 0 &&
                            !option.isEmpty()) ||
                        (type == MultipleChoiceOption.ClaimChoiceOptionType.SkipOption &&
                            defaultScore == 0 &&
                            !option.isEmpty())
                    );
                })
                .map(n ->
                    SanitizingHelper
                        .parseEnum("claimChoiceType", n, MultipleChoiceOption.ClaimChoiceOptionType.class)
                        .orElse(null)
                )
                .filter(Objects::nonNull)
                .distinct()
                .limit(3)
                .count() ==
            3
        );
    }

    public Optional<Result> getValidationResult(JsonNode node) {
        String reason = null;
        if (nodeExists(node, "question")) {
            switch (type) {
                case EssayQuestion -> {
                    if (!nodeExists(node, "defaultEvaluationType")) {
                        reason = "no evaluation type defined";
                    }
                    EvaluationType type = EvaluationType.valueOf(node.get("defaultEvaluationType").asText());
                    if (type == EvaluationType.Points && !nodeExists(node, "defaultMaxScore")) {
                        reason = "no max score defined";
                    }
                }
                case MultipleChoiceQuestion -> {
                    if (nodeExists(node, "options")) {
                        ArrayNode an = (ArrayNode) node.get("options");
                        if (an.size() < 2) {
                            reason = "i18n_minimum_of_two_options_required";
                        } else if (
                            StreamSupport
                                .stream(an.spliterator(), false)
                                .noneMatch(n -> n.get("correctOption").asBoolean())
                        ) {
                            reason = "i18n_correct_option_required";
                        }
                    } else {
                        reason = "i18n_minimum_of_two_options_required";
                    }
                }
                case WeightedMultipleChoiceQuestion -> {
                    if (!nodeExists(node, "options") || node.get("options").size() < 2) {
                        reason = "i18n_minimum_of_two_options_required";
                    } else {
                        ArrayNode options = (ArrayNode) node.get("options");
                        if (
                            StreamSupport
                                .stream(options.spliterator(), false)
                                .noneMatch(n -> n.get("defaultScore").asDouble() > 0)
                        ) {
                            reason = "i18n_correct_option_required";
                        }
                    }
                }
                case ClozeTestQuestion -> {
                    if (!nodeExists(node, "defaultMaxScore")) {
                        reason = "no max score defined";
                    } else {
                        reason = getClozeTestQuestionContentValidationResult(node);
                    }
                }
                case ClaimChoiceQuestion -> {
                    if (!nodeExists(node, "options") || node.get("options").size() != 3) {
                        reason = "i18n_three_answers_required_in_claim_question";
                    } else {
                        ArrayNode options = (ArrayNode) node.get("options");
                        boolean hasValidOptions = getClaimChoiceOptionsValidationResult(options);

                        if (!hasValidOptions) {
                            reason = "i18n_incorrect_claim_question_options";
                        }
                    }
                }
                default -> reason = "unknown question type";
            }
        } else {
            reason = "no question text defined";
        }
        if (!nodeExists(node, "questionOwners") || node.get("questionOwners").isEmpty()) {
            reason = "no owners defined";
        }
        if (reason != null) {
            return Optional.of(Results.badRequest(reason));
        }
        return Optional.empty();
    }

    public Double getMaxDefaultScore() {
        switch (getType()) {
            case EssayQuestion -> {
                if (defaultEvaluationType == EvaluationType.Points) {
                    return defaultMaxScore == null ? 0 : defaultMaxScore;
                }
            }
            case MultipleChoiceQuestion -> {
                return defaultMaxScore == null ? 0 : defaultMaxScore;
            }
            case WeightedMultipleChoiceQuestion -> {
                return options
                    .stream()
                    .map(MultipleChoiceOption::getDefaultScore)
                    .filter(score -> score != null && score > 0)
                    .reduce(0.0, Double::sum);
            }
            case ClaimChoiceQuestion -> {
                return options.stream().mapToDouble(MultipleChoiceOption::getDefaultScore).max().orElse(0.0);
            }
        }
        return 0.0;
    }

    public Double getMinDefaultScore() {
        if (getType() == Type.WeightedMultipleChoiceQuestion) {
            return options
                .stream()
                .map(MultipleChoiceOption::getDefaultScore)
                .filter(score -> score != null && score < 0)
                .reduce(0.0, Double::sum);
        } else if (getType() == Type.ClaimChoiceQuestion) {
            return options.stream().mapToDouble(MultipleChoiceOption::getDefaultScore).min().orElse(0.0);
        }
        return 0.0;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof Question other)) {
            return false;
        }
        return new EqualsBuilder().append(id, other.getId()).build();
    }

    private Question doCopy(Map<Long, MultipleChoiceOption> optionMap, boolean setParent) {
        Question question = new Question();
        if (setParent) {
            BeanUtils.copyProperties(this, question, "id", "options", "tags", "children");
            question.setParent(this);
        } else {
            BeanUtils.copyProperties(
                this,
                question,
                "id",
                "parent",
                "options",
                "tags",
                "children",
                "questionOwners",
                "creator",
                "modifier"
            );
        }
        for (MultipleChoiceOption o : options) {
            if (optionMap == null) {
                question.getOptions().add(o.copy());
            } else {
                optionMap.put(o.getId(), o.copy());
            }
        }
        if (attachment != null) {
            Attachment copy = attachment.copy();
            copy.save();
            question.setAttachment(copy);
        }
        return question;
    }

    public Question copy() {
        return doCopy(null, true);
    }

    public Question copy(Map<Long, MultipleChoiceOption> optionMap, boolean setParent) {
        return doCopy(optionMap, setParent);
    }

    @Override
    public String toString() {
        return "Question [type=" + type + ", id=" + id + "]";
    }
}
