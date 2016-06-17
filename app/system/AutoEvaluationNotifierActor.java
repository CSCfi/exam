package system;

import akka.actor.Props;
import akka.actor.UntypedActor;
import com.avaje.ebean.Ebean;
import models.AutoEvaluationConfig;
import models.Exam;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import util.java.EmailComposer;

import java.util.Date;
import java.util.List;
import java.util.Optional;

class AutoEvaluationNotifierActor extends UntypedActor {

    static final Props props = Props.create(AutoEvaluationNotifierActor.class);

    @Override
    public void onReceive(Object message) throws Exception {
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
        EmailComposer composer = (EmailComposer)message;
        exams.stream()
                .filter(this::isPastReleaseDate)
                .forEach(exam -> notifyStudent(exam, composer));

        Logger.debug("{}: ... Done", getClass().getCanonicalName());
    }

    private DateTime adjustReleaseDate(DateTime date) {
        return AppUtil.adjustDST(date.withHourOfDay(5).withMinuteOfHour(0).withSecondOfMinute(0));
    }

    private boolean isPastReleaseDate(Exam exam) {
        Optional<DateTime> releaseDate;
        AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
        switch (config.getReleaseType()) {
            // Put some delay in these dates to avoid sending stuff in the middle of the night
            case GIVEN_DATE:
                releaseDate = Optional.of(adjustReleaseDate(new DateTime(config.getReleaseDate())));
                break;
            case GIVEN_AMOUNT_DAYS:
                releaseDate = Optional.of(adjustReleaseDate(new DateTime(exam.getGradedTime()).plusDays(config.getAmountDays())));
                break;
            case AFTER_EXAM_PERIOD:
                releaseDate = Optional.of(adjustReleaseDate(new DateTime(exam.getExamActiveEndDate()).plusDays(1)));
                break;
            // Not handled at least by this actor
            case IMMEDIATE:
            case NEVER:
            default:
                releaseDate = Optional.empty();
                break;
        }
        return releaseDate.isPresent() && releaseDate.get().isBeforeNow();
    }

    private void notifyStudent(Exam exam, EmailComposer composer) {
        User student = exam.getCreator();
        try {
            composer.composeInspectionReady(student, null, exam);
            Logger.debug("{}: ... Mail sent to {}", getClass().getCanonicalName(), student.getEmail());
            exam.setAutoEvaluationNotified(new Date());
            exam.update();
        } catch (RuntimeException e) {
            Logger.error("{}: ... Sending email to {} failed", getClass().getCanonicalName(), student.getEmail());
        }
    }

}
