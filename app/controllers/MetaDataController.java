package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.questions.AbstractQuestion;
import play.mvc.Result;

import java.util.HashSet;
import java.util.Set;


public class MetaDataController extends SitnetController {

    /**
     * @param questionId <b>PARENT</b> questionId !!!
     * @return
     */
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestionMetaData(long questionId) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, questionId);

        if(question == null || question.getChildren().isEmpty()) {
            return noContent();
        }

        Set<AbstractQuestion> questions = new HashSet<>();
        for(AbstractQuestion child : question.getChildren()) {
            questions.add(Ebean.find(AbstractQuestion.class, child.getId()));
        }

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();

        options.setRootPathProperties("id, creator, type, shared, examSectionQuestion");
        options.setPathProperties("creator", "firstName, lastName");
        options.setPathProperties("examSectionQuestion", "id, examSection");
        options.setPathProperties("examSectionQuestion.examSection", "name, exam");
        options.setPathProperties("examSectionQuestion.examSection.exam", "name, course");
        options.setPathProperties("examSectionQuestion.examSection.exam.course", "code");

        return ok(jsonContext.toJsonString(questions, true, options)).as("application/json");
    }
}
