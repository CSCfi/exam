import Exceptions.AuthenticateException;
import Exceptions.MalformedDataException;
import Exceptions.UnauthorizedAccessException;
import com.avaje.ebean.Ebean;
import models.ApiError;
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
                if (cause instanceof IllegalArgumentException) {
                    return Results.badRequest(Json.toJson(new ApiError(errorMessage)));
                }
                return Results.internalServerError(Json.toJson(errorMessage));
            }
        });
        return promise;
    }

    @Override
    public Promise<SimpleResult> onBadRequest(Http.RequestHeader request, final String error) {
        return F.Promise.promise(new F.Function0<SimpleResult>() {
            public SimpleResult apply() {
                return Results.badRequest(Json.toJson(new ApiError(error)));
            }
        });
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
                Ebean.save(all.get("user-roles"));
                Ebean.save(all.get("user_languages"));
                Ebean.save(all.get("organisations"));
                Ebean.save(all.get("users"));
                Ebean.save(all.get("attachments"));
                Ebean.save(all.get("question_essay"));
                Ebean.save(all.get("question_multiple_choice"));
                Ebean.save(all.get("courses"));
                Ebean.save(all.get("comments"));
                Ebean.save(all.get("exam-types"));
                Ebean.save(all.get("exams"));
                Ebean.save(all.get("exam-sections"));
                Ebean.save(all.get("exam-participations"));
                Ebean.save(all.get("exam-inspections"));
                Ebean.save(all.get("mail-addresses"));
                Ebean.save(all.get("calendar-events"));
                Ebean.save(all.get("softwares"));
                Ebean.save(all.get("exam-rooms"));
                Ebean.save(all.get("exam-machines"));
                Ebean.save(all.get("exam-room-reservations"));
                Ebean.save(all.get("exam-enrolments"));


                // generate hashes for questions
                List<QuestionInterface> questions = (List) all.get("question_multiple_choice");
                for (QuestionInterface q : questions) {
                    q.generateHash();
                }
                Ebean.save(questions);

                // generate hashes for questions
                List<Exam> exams = (List) all.get("exams");
                for (Exam e : exams) {
                    e.generateHash();
                }
                Ebean.save(exams);

            }
        }
    }
}