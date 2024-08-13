// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.FetchConfig;
import java.util.Optional;
import javax.inject.Inject;
import models.assessment.ExamFeedbackConfig;
import models.exam.Exam;
import models.questions.ClozeTestAnswer;
import models.questions.Question;
import models.user.User;
import org.joda.time.DateTime;
import play.i18n.Lang;
import play.i18n.MessagesApi;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;
import system.interceptors.SensitiveDataPolicy;

@SensitiveDataPolicy(sensitiveFieldNames = { "score", "defaultScore", "correctOption", "claimChoiceType", "configKey" })
public class ExamAnswerController extends BaseController {

    private final MessagesApi messagesApi;

    @Inject
    public ExamAnswerController(MessagesApi messagesApi) {
        this.messagesApi = messagesApi;
    }

    private boolean canReleaseAnswers(Exam exam) {
        ExamFeedbackConfig config = exam.getParent().getExamFeedbackConfig();
        return switch (config.getReleaseType()) {
            case ONCE_LOCKED -> true;
            case GIVEN_DATE -> DateTime.now().isAfter(config.getReleaseDate().withTimeAtStartOfDay().plusDays(1));
        };
    }

    @Authenticated
    @Restrict(@Group({ "STUDENT" }))
    public Result getAnswers(Long eid, Http.Request request) {
        Optional<Exam> oe = DB.find(Exam.class)
            .fetch("course", "name, code, credits")
            .fetch("grade", "name")
            .fetch("examFeedback")
            .fetch("examSections")
            .fetch(
                "examSections.sectionQuestions",
                "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType",
                FetchConfig.ofQuery()
            )
            .fetch("examSections.sectionQuestions.question", "id, type, question")
            .fetch("examSections.sectionQuestions.question.attachment", "fileName")
            .fetch("examSections.sectionQuestions.options")
            .fetch("examSections.sectionQuestions.options.option", "id, option")
            .fetch("examSections.sectionQuestions.essayAnswer", "id, answer, evaluatedScore")
            .fetch("examSections.sectionQuestions.essayAnswer.attachment", "fileName")
            .fetch("examSections.sectionQuestions.clozeTestAnswer", "id, question, answer")
            .where()
            .idEq(eid)
            .eq("creator", request.attrs().get(Attrs.AUTHENTICATED_USER))
            .isNotNull("parent.examFeedbackConfig")
            .eq("gradeless", false)
            .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
            .findOneOrEmpty();
        if (oe.isEmpty() || !canReleaseAnswers(oe.get())) {
            return ok();
        }
        Exam exam = oe.get();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        String blankAnswerText = messagesApi.get(Lang.forCode(user.getLanguage().getCode()), "clozeTest.blank.answer");
        exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
            .forEach(esq -> {
                if (esq.getClozeTestAnswer() == null) {
                    ClozeTestAnswer cta = new ClozeTestAnswer();
                    cta.save();
                    esq.setClozeTestAnswer(cta);
                    esq.update();
                }
                esq.getClozeTestAnswer().setQuestionWithResults(esq, blankAnswerText, false);
            });
        exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .forEach(esq -> {
                esq.setDerivedMaxScore();
                esq.setDerivedAssessedScore();
            });
        exam.setMaxScore();
        exam.setTotalScore();
        // hide the correct answers for cloze test questions
        exam
            .getExamSections()
            .stream()
            .flatMap((es -> es.getSectionQuestions().stream()))
            .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
            .forEach(esq -> esq.getQuestion().setQuestion(null));

        return ok(exam);
    }
}
