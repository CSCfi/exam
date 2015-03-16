package util;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.TxType;
import com.avaje.ebean.annotation.Transactional;
import com.typesafe.config.ConfigFactory;
import controllers.UserController;
import models.*;
import org.apache.commons.codec.digest.DigestUtils;
import org.joda.time.DateTimeZone;
import play.Logger;
import play.libs.Yaml;

import javax.persistence.PersistenceException;
import java.io.File;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class SitnetUtil {

    public static String getHostName() {
        return ConfigFactory.load().getString("sitnet.application.hostname");
    }

    public static List<Integer> getExamDurations() {
        String[] durations = ConfigFactory.load().getString("sitnet.exam.durations").split(",");
        List<Integer> values = new ArrayList<>();
        for (String d : durations) {
            values.add(Integer.parseInt(d));
        }
        return values;
    }

    public static Boolean isExamGradeScaleOverridable() {
        return ConfigFactory.load().getBoolean("sitnet.exam.grading.overridable");
    }

    public static DateTimeZone getDefaultTimeZone() {
        String config = ConfigFactory.load().getString("sitnet.application.timezone");
        return DateTimeZone.forID(config);
    }

    public static SitnetModel setCreator(SitnetModel object) {

        User user = UserController.getLoggedUser();

        if (object.getCreator() == null) {
            object.setCreator(user);
            object.setCreated(new Date());
        }
        return object;
    }

    public static SitnetModel setModifier(SitnetModel object) {

        User user = UserController.getLoggedUser();

        object.setModifier(user);
        object.setModified(new Date());

        return object;
    }

    public static boolean isInspector(Exam exam) {

        User user = UserController.getLoggedUser();
        Exam examToCheck = exam.getParent() == null ? exam : exam.getParent();
        boolean isCreator = examToCheck.getCreator().getId().equals(user.getId());
        return isCreator || Ebean.find(ExamInspection.class)
                .where()
                .eq("exam.id", examToCheck.getId())
                .eq("user.id", user.getId())
                .findUnique() != null;
    }

    public static boolean isOwner(SitnetModel object) {

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

    public static String encodeMD5(String str) {
        return DigestUtils.md5Hex(str);
    }

    public static void removeAttachmentFile(String filePath) {
        // Perform disk clean upon attachment removal.
        Path path = FileSystems.getDefault().getPath(filePath);
        try {
            if (!Files.deleteIfExists(path)) {
                Logger.error("Could not delete " + path + " because it did not exist.");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void copyFile(File sourceFile, File destFile) throws IOException {
        Files.copy(sourceFile.toPath(), destFile.toPath(), StandardCopyOption.REPLACE_EXISTING,
                StandardCopyOption.COPY_ATTRIBUTES);
    }

    @Transactional(type = TxType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    public static void initializeDataModel() {
        int userCount;
        try {
            userCount = Ebean.find(User.class).findRowCount();
        } catch (PersistenceException e) {
            // Tables are likely not there yet, skip this.
            return;
        }
        if (userCount == 0) {
            String productionData = ConfigFactory.load().getString("sitnet.production.initial.data");

            // Should we load production test data
            if (productionData.equals("false")) {

                Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("initial-data.yml");

                Ebean.save(all.get("user-roles"));
                Ebean.save(all.get("user_languages"));
                Ebean.save(all.get("organisations"));
                Ebean.save(all.get("attachments"));
                Ebean.save(all.get("users"));
                Ebean.save(all.get("grade-scales"));
                Ebean.save(all.get("grades"));
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
                Ebean.save(all.get("section-questions"));
                Ebean.save(all.get("exam-participations"));
                Ebean.save(all.get("exam-inspections"));
                Ebean.save(all.get("mail-addresses"));
                Ebean.save(all.get("calendar-events"));
                Ebean.save(all.get("exam-rooms"));
                Ebean.save(all.get("exam-machines"));
                Ebean.save(all.get("exam-room-reservations"));
                Ebean.save(all.get("exam-enrolments"));
                Ebean.save(all.get("user-agreament"));
                Ebean.save(all.get("question_multiple_choice"));

                // generate hashes for exams
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
                Ebean.save(all.get("grade-scales"));
                Ebean.save(all.get("grades"));
                Ebean.save(all.get("general-settings"));
            }
        }
    }

}
