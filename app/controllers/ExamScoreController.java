package controllers;

import Exceptions.MalformedDataException;
import com.fasterxml.jackson.databind.JsonNode;
import models.dto.ExamScore;
import play.Play;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Random;

/**
 * Created by avainik on 30.6.2014.
 */
public class ExamScoreController extends SitnetController {

    private final static String PATH_PREFIX = Play.application().path().getAbsolutePath() + "/app/models/test/";

    public static Result examScoreStatic(String code) throws MalformedDataException {

//        CourseUnitInfo info = bindForm(CourseUnitInfo.class);

        String info = null;
        try {
            info = readFile(PATH_PREFIX + code +".json");
        } catch (IOException e) {
            e.printStackTrace();
        }
        JsonNode node = Json.parse(info);

/*        {
                "creditType": "osasuoritus",
                "credits": 5,
                "identifier": "xxxx",
                "courseImplementation": "2/2014",
                "courseUnitCode": "KANS2532",
                "courseUnitLevel": "syventävä",
                "courseUnitType": "viestintä",
                "creditLanguage": "fi",
                "examDate": 1401267695935,
                "ExamScore": {
                    "examScore": 25
                },
                "gradeScale": "viisiportainen",
                "lecturer": "Maika Opettaja",
                "lecturerId": "maikaope@funet.fi",
                "student": "Olli Opiskelija",
                "studentGrade": "4",
                "studentId": "olliop@funet.fi",
                "date": 1401267695935
        }*/


        ExamScore score = new ExamScore();
        score.setCreditType("osasuoritus");
        score.setCredits(node.findValue("credits").asText());
        score.setIdentifier("xxxxxxx");        // TODO: should be identifier
        score.setCourseImplementation(node.findValue("courseImplementation").asText());
        score.setCourseUnitCode(node.findValue("courseUnitCode").asText());
        score.setCourseUnitLevel(node.findValue("courseUnitLevel").asText());
        score.setCourseUnitType(node.findValue("courseUnitType").asText());
        score.setCreditLanguage(node.findValue("creditsLanguage").findValue("name").asText());
        score.setExamDate(new Timestamp(new Date().getTime()).toString());

        List<String> examScore = new ArrayList<String>();
        examScore.add(new String("25"));
        examScore.add(new String("13"));
        score.setExamScore(examScore);

        score.setGradeScale(node.findValue("gradeScale").asText());
        score.setLecturer(node.findValue("lecturer").findValue("name").asText());
        score.setLecturerId("maikaope@funet.fi");
        score.setStudent("Sauli Student");
        score.setStudentGrade("4");
        score.setStudentId("1961863");       // TODO: should be username
        score.setStudent("saulistu@funet.fi");
        score.setDate(new Timestamp(new Date().getTime()).toString());


        return ok(Json.toJson(score));
    }

    public static Result examScoreTest() throws MalformedDataException {

        DynamicForm info = Form.form().bindFromRequest();
        JsonNode json = request().body().asJson();

        ExamScore examScore = new ExamScore();
        Random rand = new Random();

        examScore.setIdentifier(json.findValue("identifier").textValue());
        examScore.setCourseUnitCode(json.findValue("courseUnitCode").textValue());
//        courseUnitTitle
        examScore.setCourseUnitLevel(json.findValue("courseUnitLevel").textValue());
        examScore.setCourseUnitType(json.findValue("courseUnitType").textValue());
        examScore.setCredits(json.findValue("credits").textValue());
        examScore.setCreditType("loppusuoritus");
//        institutionName


        if(! json.findValue("courseImplementation").isArray())
            return badRequest("courseImplementation should be array");

        if(! json.findValue("creditsLanguage").isArray())
            return badRequest("creditsLanguage should be array");


//        lecturerResponsible
        if(! json.findValue("lecturerResponsible").isArray())
            return badRequest("lecturerResponsible should be array");


//        gradeScale
        if(! json.findValue("gradeScale").isArray())
            return badRequest("gradeScale should be array");

//        gradeScale
        if(! json.findValue("lecturer").isArray())
            return badRequest("lecturer should be array");


//        Department
        if(! json.findValue("department").isArray())
            return badRequest("department should be array");

//        DegreeProgramme
        if(! json.findValue("degreeProgramme").isArray())
            return badRequest("degreeProgramme should be array");


//        Campus
        if(! json.findValue("campus").isArray())
            return badRequest("campus should be array");


//        CourseMaterial
        if(! json.findValue("courseMaterial").isArray())
            return badRequest("courseMaterial should be array");


//        CreditsLanguage
        JsonNode language = json.findValue("creditsLanguage");
        if(language.size() > 0)
        {
            int l = language.size();
            int i = rand.nextInt(language.size() );
            String value = language.get( i).findValue("name").textValue();
            examScore.setCreditLanguage(value);
        }

//        GradeScale
        JsonNode scale = json.findValue("gradeScale");
        if(scale.size() > 0)
        {
            int i = rand.nextInt(scale.size() );
            String value = scale.get( i).findValue("name").textValue();
            examScore.setGradeScale(value);
        }

//        Lecturer
        JsonNode lecturers = json.findValue("lecturer");
        if(lecturers.size() > 0)
        {
            int i = rand.nextInt(lecturers.size() );
            String value = lecturers.get(i).findValue("name").textValue();
            examScore.setLecturer(value);
            examScore.setLecturerId(value.replace(" ", ".") + "@fake.fi");
        }

        JsonNode courseImplementation = json.findValue("courseImplementation");
        if(courseImplementation.size() > 0)
        {
            int i = rand.nextInt(courseImplementation.size() );
            String value = courseImplementation.get( i).findValue("name").textValue();
            examScore.setCourseImplementation(value);
        }


        List<String> scores = new ArrayList<String>();
        scores.add(new String("25"));
        scores.add(new String("13"));
        examScore.setExamScore(scores);

        examScore.setStudent("Sauli Student");
        examScore.setStudentGrade("4");
        examScore.setStudentId("1961863");       // TODO: should be username
        examScore.setStudent("saulistu@funet.fi");
        examScore.setDate(new Timestamp(new Date().getTime()).toString());
        examScore.setExamDate(new Timestamp(new Date().getTime() - 7*24*60*60*1000).toString());    // minus one week

        return ok(Json.toJson(examScore));
    }


    static String readFile(String path) throws IOException {
        byte[] encoded = Files.readAllBytes(Paths.get(path));
        return new String(encoded);
    }
}
