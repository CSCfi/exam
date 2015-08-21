package util.java;

import com.google.inject.ImplementedBy;
import models.Exam;
import models.ExamEnrolment;
import models.Reservation;
import models.User;

import java.io.IOException;

@ImplementedBy(value = EmailComposerImpl.class)
public interface EmailComposer {

    void composeInspectionReady(User student, User reviewer, Exam exam) throws IOException;

    void composeInspectionMessage(User inspector, User sender, Exam exam, String msg) throws IOException;

    void composeWeeklySummary(User teacher) throws IOException;

    void composeReservationNotification(User student, Reservation reservation, Exam exam) throws IOException;

    void composeExamReviewRequest(User toUser, User fromUser, Exam exam, String message) throws IOException;

    void composeReservationCancellationNotification(User student, Reservation reservation, String message,
                                                    Boolean isStudentUser, ExamEnrolment enrolment) throws IOException;

    void composePrivateExamParticipantNotification(User student, User fromUser, Exam exam) throws IOException;

    void composePrivateExamEnded(User toUser, Exam exam) throws IOException;

    void composeNoShowMessage(User toUser, User student, Exam exam) throws IOException;

}
