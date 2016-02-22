package system;

import com.avaje.ebean.Ebean;
import models.AutoEvaluationConfig;
import models.Exam;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Singleton;
import java.util.Date;
import java.util.List;

@Singleton
public class AutoEvaluationNotificationPoller implements Runnable {

    EmailComposer emailComposer;

    public AutoEvaluationNotificationPoller(EmailComposer composer) {
        emailComposer = composer;
    }

    @Override
    public void run() {
        Logger.debug("{}: Running auto evaluation notification check ...", getClass().getCanonicalName());
        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("autoEvaluationConfig")
                .where()
                .eq("state", Exam.State.GRADED)
                .isNotNull("gradedTime")
                .isNotNull("autoEvaluationConfig")
                .isNotNull("grade")
                .isNotNull("creditType")
                .isNotNull("answerLanguage")
                .isNull("autoEvaluationNotified")
                .findList();

        exams.stream()
                .filter(this::isPastReleaseDate)
                .forEach(this::notifyStudent);

        Logger.debug("{}: ... Done", getClass().getCanonicalName());
    }

    private DateTime adjustReleaseDate(DateTime date) {
        return AppUtil.adjustDST(date.withHourOfDay(5).withMinuteOfHour(0).withSecondOfMinute(0));
    }

    private boolean isPastReleaseDate(Exam exam) {
        DateTime releaseDate;
        AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
        switch (config.getReleaseType()) {
            case IMMEDIATE:
                // This subtraction is to avoid a race condition
                releaseDate = DateTime.now().minusSeconds(1);
                break;
            // Put some delay in these dates to avoid sending stuff in the middle of the night
            case GIVEN_DATE:
                releaseDate = adjustReleaseDate(new DateTime(config.getReleaseDate()));
                break;
            case GIVEN_AMOUNT_DAYS:
                releaseDate = adjustReleaseDate(new DateTime(exam.getGradedTime()).plusDays(config.getAmountDays()));
                break;
            case AFTER_EXAM_PERIOD:
                releaseDate = adjustReleaseDate(new DateTime(exam.getExamActiveEndDate()));
                break;
            case NEVER:
            default:
                releaseDate = null;
                break;
        }
        return releaseDate != null && releaseDate.isBeforeNow();
    }

    private void notifyStudent(Exam exam) {
        User student = exam.getCreator();
        try {
            emailComposer.composeInspectionReady(student, null, exam);
            Logger.debug("{}: ... Mail sent to {}", getClass().getCanonicalName(), student.getEmail());
            exam.setAutoEvaluationNotified(new Date());
            exam.update();
        } catch (RuntimeException e) {
            Logger.error("{}: ... Sending email to {} failed", getClass().getCanonicalName(), student.getEmail());
        }
    }

}
