package util;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.TxType;
import com.avaje.ebean.annotation.Transactional;
import com.typesafe.config.ConfigFactory;
import models.*;
import org.apache.commons.codec.digest.DigestUtils;
import org.joda.time.DateTime;
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
import java.util.List;
import java.util.Map;

public class AppUtil {

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

    public static Boolean isCourseGradeScaleOverridable() {
        return ConfigFactory.load().getBoolean("sitnet.course.gradescale.overridable");
    }

    public static Boolean isEnrolmentPermissionCheckActive() {
        return ConfigFactory.load().getBoolean("sitnet.integration.enrolmentPermissionCheck.active");
    }

    public static DateTimeZone getDefaultTimeZone() {
        String config = ConfigFactory.load().getString("sitnet.application.timezone");
        return DateTimeZone.forID(config);
    }

    public static DateTime adjustDST(DateTime dateTime) {
        // FIXME: this method should be made unnecessary, DST adjustments should always be done based on reservation data.
        // Until we get some of the queries rephrased, we have to live with this quick-fix
        return doAdjustDST(dateTime, null);
     }

    public static DateTime adjustDST(DateTime dateTime, Reservation reservation) {
        return doAdjustDST(dateTime, reservation.getMachine().getRoom());
    }

    public static DateTime adjustDST(DateTime dateTime, ExamRoom room) {
        return doAdjustDST(dateTime, room);
    }

    private static DateTime doAdjustDST(DateTime dateTime, ExamRoom room) {
        DateTimeZone dtz;
        if (room == null) {
            dtz = getDefaultTimeZone();
        } else {
            dtz = DateTimeZone.forID(room.getLocalTimezone());
        }
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            dateTime = dateTime.plusHours(1);
        }
        return dateTime;
    }

    public static OwnedModel setCreator(OwnedModel object, User user) {
        if (object.getCreator() == null) {
            object.setCreator(user);
            object.setCreated(DateTime.now().toDate());
        }
        return object;
    }

    public static OwnedModel setModifier(OwnedModel object, User user) {
        object.setModifier(user);
        object.setModified(DateTime.now().toDate());
        return object;
    }

    public static String encodeMD5(String str) {
        return DigestUtils.md5Hex(str);
    }

    public static void removeAttachmentFile(String filePath) {
        // Remove physical file upon attachment removal.
        Path path = FileSystems.getDefault().getPath(filePath);
        try {
            if (!Files.deleteIfExists(path)) {
                Logger.error("Could not delete " + path + " because it does not exist.");
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
                if (Ebean.find(GradeScale.class).findRowCount() == 0) { // Might already be inserted by evolution
                    Ebean.save(all.get("grade-scales"));
                }
                if (Ebean.find(Grade.class).findRowCount() == 0) { // Might already be inserted by evolution
                    Ebean.save(all.get("grades"));
                }
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
                if (Ebean.find(Language.class).findRowCount() == 0) { // Might already be inserted by evolution
                    Ebean.save(all.get("languages"));
                }
                Ebean.save(all.get("exam-types"));
                Ebean.save(all.get("softwares"));
                if (Ebean.find(GradeScale.class).findRowCount() == 0) {
                    Ebean.save(all.get("grade-scales"));
                }
                if (Ebean.find(Grade.class).findRowCount() == 0) {
                    Ebean.save(all.get("grades"));
                }
                Ebean.save(all.get("general-settings"));
            }
        }
    }

}
