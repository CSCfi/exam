package util.java;

import com.google.inject.ImplementedBy;
import models.Exam;
import models.ExamEnrolment;
import models.LanguageInspection;
import models.Reservation;
import models.User;

import java.util.Set;

@ImplementedBy(value = EmailComposerImpl.class)
public interface EmailComposer {

    /**
     * Message sent to student when review is ready.
     */
    void composeInspectionReady(User student, User reviewer, Exam exam, Set<User> cc);

    /**
     * Message sent to student when review is ready.
     */
    void composeInspectionMessage(User inspector, User sender, Exam exam, String msg);

    /**
     * Weekly summary report
     */
    void composeWeeklySummary(User teacher);

    /**
     * Message sent to student when reservation has been made.
     */
    void composeReservationNotification(User student, Reservation reservation, Exam exam, Boolean isReminder);

    /**
     * Message sent to newly added inspectors.
     */
    void composeExamReviewRequest(User toUser, User fromUser, Exam exam, String message);

    /**
     * Message sent to student when reservation has been cancelled.
     */
    void composeReservationCancellationNotification(User student, Reservation reservation, String message,
                                                    Boolean isStudentUser, ExamEnrolment enrolment);

    /**
     * Message sent to student when he/she has been enrolled to a private exam.
     */
    void composePrivateExamParticipantNotification(User student, User fromUser, Exam exam);

    /**
     * Message sent to teacher when student has finished a private exam.
     */
    void composePrivateExamEnded(User toUser, Exam exam);

    /**
     * Message sent to teacher when student did not show up for a private exam.
     */
    void composeNoShowMessage(User toUser, User student, Exam exam);

    /**
     * Message sent to student when he did not show up for exam.
     */
    void composeNoShowMessage(User student, Exam exam);

    /**
     * Message sent to teacher when language inspection is finished.
     */
    void composeLanguageInspectionFinishedMessage(User toUser, User inspector, LanguageInspection inspection);

}
