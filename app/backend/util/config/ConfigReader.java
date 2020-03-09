package backend.util.config;

import java.util.List;
import java.util.Map;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;

import backend.models.Role;

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
    String getQuitExaminationLink();
    String getSettingsPasswordEncryptionKey();
    String getQuitPassword();
    String getHomeOrganisationRef();
}
