package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.questions.Question;
import play.mvc.Result;

import java.util.Set;
import java.util.stream.Collectors;


public class MetaDataController extends BaseController {

    /**
     * @param questionId <b>PARENT</b> questionId !!!
     */
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getQuestionMetaData(long questionId) {

        Question question = Ebean.find(Question.class)
                .fetch("creator", "firstName, lastName")
                .fetch("examSectionQuestion", "id")
                .fetch("examSectionQuestion.examSection", "name")
                .fetch("examSectionQuestion.examSection.exam", "name")
                .fetch("examSectionQuestion.examSection.exam.course", "code")
                .where().idEq(questionId).findUnique();
        if(question == null || question.getChildren().isEmpty()) {
            return noContent();
        }
        Set<Question> questions = question.getChildren().stream()
                .map(c -> Ebean.find(Question.class, c.getId())).collect(Collectors.toSet());
        return ok(questions);
    }
}
