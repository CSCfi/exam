package util.java;

import com.google.inject.ImplementedBy;
import models.*;

@ImplementedBy(value = EmailComposerImpl.class)
public interface EmailComposer {

    void composeInspectionReady(User student, User reviewer, Exam exam);

    void composeInspectionMessage(User inspector, User sender, Exam exam, String msg);

    void composeWeeklySummary(User teacher);

    void composeReservationNotification(User student, Reservation reservation, Exam exam, boolean isTeacher);

    void composeExamReviewRequest(User toUser, User fromUser, Exam exam, String message);

    void composeReservationCancellationNotification(User student, Reservation reservation, String message,
                                                    Boolean isStudentUser, ExamEnrolment enrolment);

    void composePrivateExamParticipantNotification(User student, User fromUser, Exam exam);

    void composePrivateExamEnded(User toUser, Exam exam);

    void composeNoShowMessage(User toUser, User student, Exam exam);

    void composeLanguageInspectionFinishedMessage(User toUser, User inspector, LanguageInspection inspection);

}
