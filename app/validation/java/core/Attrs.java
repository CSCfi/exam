// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.java.core;

import java.util.List;
import models.exam.Exam;
import models.user.User;
import org.joda.time.LocalDate;
import play.libs.typedmap.TypedKey;
import validation.scala.answer.ClozeTestAnswerDTO;
import validation.scala.answer.EssayAnswerDTO;
import validation.scala.calendar.ExternalReservationDTO;
import validation.scala.calendar.ReservationDTO;
import validation.scala.exam.ExaminationEventDTO;
import validation.scala.section.SectionQuestionDTO;

public enum Attrs {
    ;

    public static final TypedKey<String> ENROLMENT_INFORMATION = TypedKey.create("enrolmentInformation");
    public static final TypedKey<String> LANG = TypedKey.create("lang");
    public static final TypedKey<List<Long>> ID_COLLECTION = TypedKey.create("idCollection");
    public static final TypedKey<List<String>> REF_COLLECTION = TypedKey.create("refCollection");
    public static final TypedKey<LocalDate> DATE = TypedKey.create("date");
    public static final TypedKey<Long> USER_ID = TypedKey.create("userId");
    public static final TypedKey<String> EMAIL = TypedKey.create("email");
    public static final TypedKey<String> TYPE = TypedKey.create("type");
    public static final TypedKey<String> COMMENT = TypedKey.create("comment");
    public static final TypedKey<Long> COMMENT_ID = TypedKey.create("commentId");
    public static final TypedKey<Boolean> FEEDBACK_STATUS = TypedKey.create("feedbackStatus");
    public static final TypedKey<String> COURSE_CODE = TypedKey.create("code");
    public static final TypedKey<String> QUESTION_TEXT = TypedKey.create("question");
    public static final TypedKey<User> AUTHENTICATED_USER = TypedKey.create("authenticatedUser");
    public static final TypedKey<Exam> EXAM = TypedKey.create("exam");
    public static final TypedKey<ReservationDTO> STUDENT_RESERVATION = TypedKey.create("reservation");
    public static final TypedKey<ExternalReservationDTO> EXT_STUDENT_RESERVATION = TypedKey.create("extReservation");
    public static final TypedKey<ClozeTestAnswerDTO> CLOZE_TEST_ANSWER = TypedKey.create("answerCloze");
    public static final TypedKey<EssayAnswerDTO> ESSAY_ANSWER = TypedKey.create("answerEssay");
    public static final TypedKey<ExaminationEventDTO> EXAMINATION_EVENT = TypedKey.create("examinationEvent");
    public static final TypedKey<SectionQuestionDTO> SECTION_QUESTION = TypedKey.create("sectionQuestion");
}
