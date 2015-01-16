package util;

import Exceptions.SitnetException;
import annotations.NonCloneable;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.typesafe.config.ConfigFactory;
import controllers.UserController;
import models.*;
import models.questions.QuestionInterface;
import org.apache.commons.codec.digest.DigestUtils;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import play.libs.Yaml;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Date;
import java.util.List;
import java.util.Map;


/**
 * Created by avainik on 3/19/14.
 */
public class SitnetUtil {

    public static String getHostName() {
        return ConfigFactory.load().getString("sitnet.application.hostname");
    }

    //FIXME: This reflection thing is f*cked up, we should have customized cloning methods and not rely on this
    public static Object getClone(Object object) {

        Object clone;
        try {
            clone = object.getClass().newInstance();
        } catch (InstantiationException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }

        // Walk up the superclass hierarchy
        for (Class obj = object.getClass(); !obj.equals(Object.class); obj = obj.getSuperclass()) {
            Field[] fields = obj.getDeclaredFields();
            for (Field field : fields) {
                field.setAccessible(true);
                try {
                    if (field.get(object) != null && field.getAnnotation(JsonBackReference.class) == null) {
                        if (field.getAnnotation(NonCloneable.class) == null) {
                            field.setAccessible(true);
                            Class<?> clazz = field.get(object).getClass();
                            Class<?> superclass = clazz.getSuperclass();
                            if (SitnetModel.class.isAssignableFrom(superclass)) {
                                try {
                                    Method method = clazz.getDeclaredMethod("clone");
                                    if (method == null) {
                                        break;
                                    } else {
                                        if (field.get(object) != null) {
                                            Object obo = method.invoke(field.get(object));
                                            field.set(clone, obo);
                                        }
                                    }
                                } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException e) {
                                    throw new RuntimeException(e);
                                }
                            } else {
                                if (field.get(object) != null) {
                                    String name = field.getName().toLowerCase();

                                    // if this is SitnetModel and must be cloned; set ID null
                                    // http://avaje.org/topic-112.html
                                    // removing ebean fields helps in some cases
                                    if (!name.startsWith("_ebean"))
                                        field.set(clone, field.get(object));
                                    if (name.equals("id"))
                                        field.set(clone, null);
                                    if (name.equals("ebeantimestamp"))
                                        field.set(clone, null);
                                }
                            }
                        } else
                            try {
                                field.setAccessible(true);
                                if (field.get(object) != null)
                                    field.set(clone, field.get(object));
                            } catch (IllegalAccessException e) {
                                throw new RuntimeException(e);
                            }
                    }
                } catch (IllegalAccessException e) {
                    throw new RuntimeException(e);
                }
            }
        }
        return clone;
    }

    static public SitnetModel setCreator(SitnetModel object) throws SitnetException {

        User user = UserController.getLoggedUser();

        if (object.getCreator() == null) {
            object.setCreator(user);
            object.setCreated(new Date());
        } else {
            throw new SitnetException("Object already has creator");
        }
        return object;
    }

    static public SitnetModel setModifier(SitnetModel object) {

        User user = UserController.getLoggedUser();

        object.setModifier(user);
        object.setModified(new Date());

        return object;
    }

    static public boolean isInspector(Exam exam) {

        User user = UserController.getLoggedUser();
        Exam examToCheck = exam.getParent() == null ? exam : exam.getParent();
        boolean isCreator = examToCheck.getCreator().getId().equals(user.getId());
        return isCreator || Ebean.find(ExamInspection.class)
                .where()
                .eq("exam.id", examToCheck.getId())
                .eq("user.id", user.getId())
                .findUnique() != null;
    }

    static public boolean isOwner(SitnetModel object) {

        User user = UserController.getLoggedUser();

        if (object.getCreator() == null) {
            Class<?> clazz = object.getClass();

            Object asd = Ebean.find(clazz)
                    .select("creator.id")
                    .where()
                    .eq("id", object.getId())
                    .findUnique();

            object.setCreator(((SitnetModel) asd).getCreator());
        }

        return object.getCreator() != null && object.getCreator().getId().equals(user.getId());
    }

    static public String encodeMD5(String str) {
        return DigestUtils.md5Hex(str);
    }

    static public void removeAttachmentFile(String filePath) {
        // Perform disk clean upon attachment removal.
        Path path = FileSystems.getDefault().getPath(filePath);
        try {
            if (!Files.deleteIfExists(path)) {
                System.err.println("Could not delete " + path + " because it did not exist.");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    static public Date getNowTime() {
        return DateTime.now().plus(DateTimeZone.forID("Europe/Helsinki").getOffset(DateTime.now())).toDate();
    }

    public static void copyFile(File sourceFile, File destFile) throws IOException {
        Files.copy(sourceFile.toPath(), destFile.toPath(), StandardCopyOption.REPLACE_EXISTING,
                StandardCopyOption.COPY_ATTRIBUTES);
    }

    @SuppressWarnings("unchecked")
    public static void initializeDataModel() {
        if (Ebean.find(User.class).findRowCount() == 0) {

            String productionData = ConfigFactory.load().getString("sitnet.production.initial.data");

            // Should we load production test data
            if (productionData.equals("false")) {

                Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("initial-data.yml");

                Ebean.save(all.get("user-roles"));
                Ebean.save(all.get("user_languages"));
                Ebean.save(all.get("organisations"));
                Ebean.save(all.get("attachments"));
                Ebean.save(all.get("users"));
                Ebean.save(all.get("question_essay"));
                Ebean.save(all.get("question_multiple_choice"));
                Ebean.save(all.get("softwares"));
                Ebean.save(all.get("courses"));
                Ebean.save(all.get("comments"));
                if (Ebean.find(Language.class).findRowCount() == 0) { // Might already be inserted by evolution
                    Ebean.save(all.get("languages"));
                }
                Ebean.save(all.get("exam-types"));
                Ebean.save(all.get("exams"));
                Ebean.save(all.get("exam-sections"));
                // Need to explicitly set the embedded compound key.
                for (Object o : all.get("section-questions")) {
                    ExamSectionQuestion src = (ExamSectionQuestion) o;
                    ExamSectionQuestion dest = new ExamSectionQuestion(src.getExamSection(), src.getQuestion());
                    dest.setSequenceNumber(src.getSequenceNumber());
                    Ebean.save(dest);
                }
                Ebean.save(all.get("exam-participations"));
                Ebean.save(all.get("exam-inspections"));
                Ebean.save(all.get("mail-addresses"));
                Ebean.save(all.get("calendar-events"));
                Ebean.save(all.get("exam-rooms"));
                Ebean.save(all.get("exam-machines"));
                Ebean.save(all.get("exam-room-reservations"));
                Ebean.save(all.get("exam-enrolments"));
                Ebean.save(all.get("user-agreament"));
                Ebean.save(all.get("grades"));

                // generate hashes for questions
                List<Object> questions = all.get("question_multiple_choice");
                for (Object q : questions) {
                    ((QuestionInterface) q).generateHash();
                }
                Ebean.save(questions);

                // generate hashes for questions
                List<Object> exams = all.get("exams");
                for (Object e : exams) {
                    ((Exam) e).generateHash();
                }
                Ebean.save(exams);
            } else if (productionData.equals("true")) {

                Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("production-initial-data.yml");

                Ebean.save(all.get("user-roles"));
                Ebean.save(all.get("user_languages"));
                Ebean.save(all.get("users"));
                Ebean.save(all.get("exam-types"));
                Ebean.save(all.get("softwares"));
                Ebean.save(all.get("grades"));
                Ebean.save(all.get("general-settings"));
            }
        }
    }

}
