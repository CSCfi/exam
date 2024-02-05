package util.config;

import java.util.List;
import java.util.Map;
import models.Role;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;

public interface ConfigReader {
    DateTimeZone getDefaultTimeZone();
    String getHostName();
    Integer getMaxFileSize();
    String getExamMaxDate();
    List<Integer> getExamDurations();
    Integer getExamMaxDuration();
    Integer getExamMinDuration();
    Map<Role, List<String>> getRoleMapping();
    boolean isCourseGradeScaleOverridable();
    boolean isEnrolmentPermissionCheckActive();
    boolean isVisitingExaminationSupported();
    boolean isCollaborationExaminationSupported();
    boolean isHomeExaminationSupported();
    boolean isSebExaminationSupported();
    boolean isCourseSearchActive();
    Map<String, String> getCourseIntegrationUrls();
    DateTime getExamExpirationDate(DateTime timeOfSubmission);
    DateTime getCourseValidityDate(DateTime startDate);
    String getExamExpirationPeriod();
    boolean isMaturitySupported();
    boolean isPrintoutSupported();
    String getAppVersion();
    boolean isAnonymousReviewEnabled();
    String getQuitExaminationLink();
    String getExaminationAdminPassword();
    String getSettingsPasswordEncryptionKey();
    String getHomeOrganisationRef();
    Integer getMaxByodExaminationParticipantCount();
    boolean isByodExamCreationPermissionGrantedForNewUsers();
    String getCourseCodePrefix();
    String getIopHost();
    boolean isApiKeyUsed();
    String getApiKeyName();
    String getApiKeyValue();
    String getPermissionCheckUserIdentifier();
    String getPermissionCheckUrl();
    String getBaseSystemUrl();
    String getSystemAccount();
    String getAttachmentPath();
    String getLoginType();
    String getCsrfCookie();
    boolean isMultiStudentIdEnabled();
    String getMultiStudentOrganisations();

    boolean hasPath(String path);
    String getString(String path);
}
