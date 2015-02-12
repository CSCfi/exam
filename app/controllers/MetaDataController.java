package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.questions.AbstractQuestion;
import play.Logger;
import play.mvc.Result;

import java.util.List;


public class MetaDataController extends SitnetController {

    /**
     * NOT WORKING !!!!!!!!!!!!
     * @param parentQuestionId
     * @return
     */
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getQuestionMetaDataByQuestion(long parentQuestionId) {

        List<AbstractQuestion> children = Ebean.find(AbstractQuestion.class)
                .where()
                .eq("parent.id", parentQuestionId)
                .findList();

        Logger.debug("children.size()=" + children.size());

        ObjectMapper json = new ObjectMapper();
        ObjectNode obj = json.createObjectNode();

        if(!children.isEmpty()) {

            for (AbstractQuestion child : children) {

                String examName = child.getExamSectionQuestion().getExamSection().getExam().getName() != null ?
                        child.getExamSectionQuestion().getExamSection().getExam().getName() : "";
                String courseCode = child.getExamSectionQuestion().getExamSection().getExam().getCourse().getCode() != null ?
                        child.getExamSectionQuestion().getExamSection().getExam().getCourse().getCode() : "";
                String sectionName = child.getExamSectionQuestion().getExamSection().getName() != null ?
                        child.getExamSectionQuestion().getExamSection().getName() : "";

                ArrayNode array = json.createArrayNode()
                        .insert(0, json.createObjectNode().put("examName", examName))
                        .insert(1, json.createObjectNode().put("courseCode", courseCode))
                        .insert(2, json.createObjectNode().put("sectionName", sectionName))
                        .insert(3, json.createObjectNode().put("created", child.getCreated() != null ? child.getCreated().toString() : ""))
                        .insert(4, json.createObjectNode().put("modified", child.getModified() != null ? child.getModified().toString() : ""))
                        .insert(5, json.createObjectNode().put("creator", child.getCreator() != null ? child.getCreator().getFirstName() + " " + child.getCreator().getLastName() : ""))
                        .insert(6, json.createObjectNode().put("shared", child.isShared()));
                obj.putObject(array.toString());
            }
        }

        if(Logger.isDebugEnabled()) {
            Logger.debug(json.toString());
        }

        return ok(json.toString()).as("application/json");
    }
}
