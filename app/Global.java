import Exceptions.AuthenticateException;
import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.User;
import models.questions.QuestionInterface;
import play.Application;
import play.GlobalSettings;
import play.Logger;
import play.libs.F;
import play.libs.F.Promise;
import play.libs.Json;
import play.libs.Yaml;
import play.mvc.Action;
import play.mvc.Http;
import play.mvc.Http.Request;
import play.mvc.Results;
import play.mvc.SimpleResult;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;

public class Global extends GlobalSettings {

    @Override
    public void onStart(Application app) {
        InitialData.insert(app);
    }

    @Override
    public Promise<SimpleResult> onError(Http.RequestHeader request, final Throwable t) {
        F.Promise<SimpleResult> promise = F.Promise.promise(new F.Function0<SimpleResult>() {
            public SimpleResult apply() {
                Throwable cause = t.getCause();
                String errorMessage = cause.getMessage();
                if (cause instanceof UnauthorizedAccessException) {
                    return Results.forbidden(Json.toJson(errorMessage));
                }
                if (cause instanceof AuthenticateException) {
                    return Results.unauthorized(Json.toJson(errorMessage));
                }
                if (cause instanceof MalformedDataException) {
                    return Results.badRequest(Json.toJson(errorMessage));
                }
                return Results.internalServerError(Json.toJson(errorMessage));
            }
        });
        return promise;
    }

    @Override
    public Action onRequest(Request request, Method actionMethod) {
        Logger.debug(request.path());
        return super.onRequest(request, actionMethod);
    }

    private static class InitialData {
        public static void insert(Application app) {
            if (Ebean.find(User.class).findRowCount() == 0) {
                @SuppressWarnings("unchecked")
                Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("initial-data.yml");
                
                // HUOM, järjestyksellä on väliä 
                Ebean.save(all.get("user_languages"));
                Ebean.save(all.get("users"));
                Ebean.save(all.get("courses"));
                Ebean.save(all.get("question_mutiple_choice"));
                Ebean.save(all.get("exams"));
                Ebean.save(all.get("examsections"));
                Ebean.save(all.get("exam-enrolments"));
                Ebean.save(all.get("exam-inspections"));
                Ebean.save(all.get("mail-addresses"));
                Ebean.save(all.get("exam-rooms"));
                Ebean.save(all.get("exam-machines"));

                // generate hashes for questions
                List<QuestionInterface> questions = (List)all.get("question_mutiple_choice");
                for (QuestionInterface q : questions){
                    q.generateHash();
                }
                Ebean.save(questions);

                // generate hashes for questions
                List<Exam> exams = (List)all.get("exams");
                for (Exam e : exams){
                    e.generateHash();
                }
                Ebean.save(exams);

            }
        }
    }
}