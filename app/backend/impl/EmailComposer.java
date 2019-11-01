/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.impl;

import java.util.Set;

import com.google.inject.ImplementedBy;

import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamMachine;
import backend.models.LanguageInspection;
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.CollaborativeExam;

@ImplementedBy(value = EmailComposerImpl.class)
public interface EmailComposer {

    /**
     * Message sent to student when review is ready.
     */
    void composeInspectionReady(User student, User reviewer, Exam exam, Set<User> cc);

    /**
     * Message sent to other inspectors when review is ready.
     */
    void composeInspectionMessage(User inspector, User sender, Exam exam, String msg);
    void composeInspectionMessage(User inspector, User sender, CollaborativeExam ce, Exam exam, String msg);

    /**
     * Weekly summary report
     */
    void composeWeeklySummary(User teacher);

    /**
     * Message sent to student when reservation has been made.
     */
    void composeReservationNotification(User student, Reservation reservation, Exam exam, Boolean isReminder);

    /**
     * Message sent to student when examination event has been selected.
     */
    void composeExaminationEventNotification(User student, ExamEnrolment enrolment, Boolean isReminder);

    /**
     * Message sent to student when examination event has been cancelled.
     */
    void composeExaminationEventCancellationNotification(User user, ExamEnrolment enrolment);

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
     * Message sent to student when externally made reservation has been cancelled by hosting admin.
     */
    void composeExternalReservationCancellationNotification(Reservation reservation, String message);

    /**
     * Message sent to student when reservation has been changed.
     */
    void composeReservationChangeNotification(User student, ExamMachine previous, ExamMachine current,
                                              ExamEnrolment enrolment);

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
    void composeNoShowMessage(User student, String examName, String courseCode);

    /**
     * Message sent to teacher when language inspection is finished.
     */
    void composeLanguageInspectionFinishedMessage(User toUser, User inspector, LanguageInspection inspection);

    /**
     * Message sent to teacher when collaborative exam is created in the system.
     */
    void composeCollaborativeExamAnnouncement(Set<String> emails, User sender, Exam exam);

}
