package util;

import com.typesafe.config.ConfigFactory;
import models.Exam;
import models.ExamRoom;
import models.Reservation;
import models.User;
import models.base.OwnedModel;
import models.iop.ExternalReservation;
import org.apache.commons.codec.digest.DigestUtils;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Period;
import play.Logger;
import util.java.EmailComposer;

import java.io.File;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public final class AppUtil {

    private AppUtil() {}

    public static String getHostName() {
        return ConfigFactory.load().getString("sitnet.application.hostname");
    }

    public static Integer getMaxFileSize() {
        return ConfigFactory.load().getInt("sitnet.attachment.maxsize");
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

    public static boolean isInteroperable() {
        return ConfigFactory.load().getBoolean("sitnet.integration.iop.active");
    }

    public static DateTimeZone getDefaultTimeZone() {
        String config = ConfigFactory.load().getString("sitnet.application.timezone");
        return DateTimeZone.forID(config);
    }

    public static DateTime getExamExpirationDate(DateTime timeOfSubmission) {
        String expiresAfter = ConfigFactory.load().getString("sitnet.exam.expiration.period");
        Period period = Period.parse(expiresAfter);
        return timeOfSubmission.plus(period);
    }

    public static String getAppVersion() {
        return ConfigFactory.load().getString("exam.release.version");
    }

    public static DateTime adjustDST(DateTime dateTime) {
        // FIXME: this method should be made unnecessary, DST adjustments should always be done based on reservation data.
        // Until we get some of the queries rephrased, we have to live with this quick-fix
        return doAdjustDST(dateTime, null);
    }

    public static DateTime adjustDST(DateTime dateTime, Reservation reservation) {
        return reservation.getExternalReservation() != null ?
                adjustDST(dateTime, reservation.getExternalReservation()) :
                doAdjustDST(dateTime, reservation.getMachine().getRoom());
    }

    public static DateTime adjustDST(DateTime dateTime, ExternalReservation externalReservation) {
        DateTime result = dateTime;
        DateTimeZone dtz = DateTimeZone.forID(externalReservation.getRoomTz());
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            result = dateTime.plusHours(1);
        }
        return result;
    }

    public static DateTime adjustDST(DateTime dateTime, ExamRoom room) {
        return doAdjustDST(dateTime, room);
    }

    private static DateTime doAdjustDST(DateTime dateTime, ExamRoom room) {
        DateTimeZone dtz;
        DateTime result = dateTime;
        if (room == null) {
            dtz = getDefaultTimeZone();
        } else {
            dtz = DateTimeZone.forID(room.getLocalTimezone());
        }
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            result = dateTime.plusHours(1);
        }
        return result;
    }

    public static DateTime withTimeAtStartOfDayConsideringTz(DateTime src) {
        DateTimeZone dtz = getDefaultTimeZone();
        return src.withTimeAtStartOfDay().plusMillis(dtz.getOffset(src));
    }

    public static DateTime withTimeAtEndOfDayConsideringTz(DateTime src) {
        DateTimeZone dtz = getDefaultTimeZone();
        return src.plusDays(1).withTimeAtStartOfDay().plusMillis(dtz.getOffset(src));
    }

    public static OwnedModel setCreator(OwnedModel object, User user) {
        object.setCreator(user);
        object.setCreated(DateTime.now());
        return object;
    }

    public static OwnedModel setModifier(OwnedModel object, User user) {
        object.setModifier(user);
        object.setModified(DateTime.now());
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

    public static void notifyPrivateExamEnded(Collection<User> recipients, Exam exam, EmailComposer composer) {
        for (User r : recipients) {
            composer.composePrivateExamEnded(r, exam);
            Logger.info("Email sent to {}", r.getEmail());
        }
    }

}
