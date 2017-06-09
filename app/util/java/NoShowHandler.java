package util.java;

import com.google.inject.ImplementedBy;
import models.ExamEnrolment;

import java.util.List;

@ImplementedBy(NoShowHandlerUtil.class)
public interface NoShowHandler {

    void handleNoShows(List<ExamEnrolment> noShows, Class<?> sender);
    void handleNoShow(ExamEnrolment noShow);
    void handleNoShowAndNotify(ExamEnrolment enrolment);

}
