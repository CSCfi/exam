package backend.util.config;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.google.inject.ImplementedBy;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import play.mvc.Http;
import play.mvc.Result;

import backend.models.Role;

@ImplementedBy(ConfigReaderImpl.class)
public interface ConfigReader {

    DateTimeZone getDefaultTimeZone();
    String getHostName();
    Integer getMaxFileSize();
    List<Integer> getExamDurations();
    Map<Role, List<String>> getRoleMapping();
    boolean isCourseGradeScaleOverridable();
    boolean isEnrolmentPermissionCheckActive();
    boolean isVisitingExaminationSupported();
    boolean isCollaborationExaminationSupported();
    boolean isCourseSearchActive();
    Map<String, String> getCourseIntegrationUrls();
    DateTime getExamExpirationDate(DateTime timeOfSubmission);
    String getExamExpirationPeriod();
    boolean isMaturitySupported();
    boolean isPrintoutSupported();
    String getAppVersion();
    boolean isAnonymousReviewEnabled();
    Optional<Result> checkUserAgent(Http.RequestHeader request);
    String getBrowserExamKey();
    String getExamConfigurationKey();
    String getQuitExaminationLink();

}
