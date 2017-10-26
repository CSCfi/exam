package sanitizers;

import models.AutoEvaluationConfig;
import models.Exam;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import play.libs.typedmap.TypedKey;

import java.util.Collection;

public enum Attrs {
    ;
    public static final TypedKey<String> ENROLMENT_INFORMATION = TypedKey.create("enrolmentInformation");
    public static final TypedKey<String> INSTRUCTION = TypedKey.create("instruction");
    public static final TypedKey<String> LANG = TypedKey.create("lang");
    public static final TypedKey<Long> ROOM_ID = TypedKey.create("roomId");
    public static final TypedKey<Long> EXAM_ID = TypedKey.create("examId");
    public static final TypedKey<Integer> GRADE_ID = TypedKey.create("gradeId");
    public static final TypedKey<Collection<Integer>> ACCESSABILITES = TypedKey.create("accessabilities");
    public static final TypedKey<Collection<Long>> ID_COLLECTION = TypedKey.create("idCollection");
    public static final TypedKey<LocalDate> DATE = TypedKey.create("date");
    public static final TypedKey<DateTime> START_DATE = TypedKey.create("startDate");
    public static final TypedKey<DateTime> END_DATE = TypedKey.create("endDate");
    public static final TypedKey<Long> USER_ID = TypedKey.create("userId");
    public static final TypedKey<String> EMAIL = TypedKey.create("email");
    public static final TypedKey<String> NAME = TypedKey.create("name");
    public static final TypedKey<String> REFERENCE = TypedKey.create("reference");
    public static final TypedKey<Integer> DURATION = TypedKey.create("duration");
    public static final TypedKey<Exam.State> EXAM_STATE = TypedKey.create("examState");
    public static final TypedKey<String> TYPE = TypedKey.create("type");
    public static final TypedKey<Boolean> SHARED = TypedKey.create("shared");
    public static final TypedKey<Boolean> EXPANDED = TypedKey.create("expanded");
    public static final TypedKey<Integer> TRIAL_COUNT = TypedKey.create("trialCount");
    public static final TypedKey<Boolean> LANG_INSPECTION_REQUIRED = TypedKey.create("langInspectionRequired");
    public static final TypedKey<AutoEvaluationConfig> AUTO_EVALUATION_CONFIG = TypedKey.create("autoEvaluationConfig");
    public static final TypedKey<String> COMMENT = TypedKey.create("comment");
}
