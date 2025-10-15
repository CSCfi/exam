// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package sanitizers;

import java.util.Collection;
import models.exam.Exam;
import models.user.User;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import play.libs.typedmap.TypedKey;

public enum Attrs {
    ;

    public static final TypedKey<String> ENROLMENT_INFORMATION = TypedKey.create("enrolmentInformation");
    public static final TypedKey<String> LANG = TypedKey.create("lang");
    public static final TypedKey<Long> ROOM_ID = TypedKey.create("roomId");
    public static final TypedKey<String> ROOM_REF = TypedKey.create("roomId");
    public static final TypedKey<String> ORG_REF = TypedKey.create("orgId");
    public static final TypedKey<Long> EXAM_ID = TypedKey.create("examId");
    public static final TypedKey<Collection<Integer>> ACCESSIBILITIES = TypedKey.create("accessabilities");
    public static final TypedKey<Collection<Long>> SECTION_IDS = TypedKey.create("sections");
    public static final TypedKey<Collection<Long>> ID_COLLECTION = TypedKey.create("idCollection");
    public static final TypedKey<Collection<String>> REF_COLLECTION = TypedKey.create("refCollection");
    public static final TypedKey<LocalDate> DATE = TypedKey.create("date");
    public static final TypedKey<DateTime> START_DATE = TypedKey.create("startDate");
    public static final TypedKey<DateTime> END_DATE = TypedKey.create("endDate");
    public static final TypedKey<Long> USER_ID = TypedKey.create("userId");
    public static final TypedKey<String> EMAIL = TypedKey.create("email");
    public static final TypedKey<String> TYPE = TypedKey.create("type");
    public static final TypedKey<String> COMMENT = TypedKey.create("comment");
    public static final TypedKey<Long> COMMENT_ID = TypedKey.create("commentId");
    public static final TypedKey<Boolean> FEEDBACK_STATUS = TypedKey.create("feedbackStatus");
    public static final TypedKey<String> COURSE_CODE = TypedKey.create("code");
    public static final TypedKey<String> SETTINGS_PASSWORD = TypedKey.create("settingsPassword");
    public static final TypedKey<String> QUIT_PASSWORD = TypedKey.create("quitPassword");
    public static final TypedKey<String> QUESTION_TEXT = TypedKey.create("question");
    public static final TypedKey<String> ANSWER_INSTRUCTIONS = TypedKey.create("answerInstructions");
    public static final TypedKey<String> EVALUATION_CRITERIA = TypedKey.create("evaluationCriteria");
    public static final TypedKey<String> ESSAY_ANSWER = TypedKey.create("essayAnswer");
    public static final TypedKey<Long> OBJECT_VERSION = TypedKey.create("objectVersion");
    public static final TypedKey<User> AUTHENTICATED_USER = TypedKey.create("authenticatedUser");
    public static final TypedKey<String> DESCRIPTION = TypedKey.create("description");
    public static final TypedKey<Integer> CAPACITY = TypedKey.create("capacity");
    public static final TypedKey<Exam> EXAM = TypedKey.create("exam");
}
