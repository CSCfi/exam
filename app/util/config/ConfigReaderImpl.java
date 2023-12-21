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

package util.config;

import com.typesafe.config.Config;
import io.ebean.DB;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.ExamExecutionType;
import models.Role;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Period;

public class ConfigReaderImpl implements ConfigReader {

    private final Config config;

    @Inject
    public ConfigReaderImpl(Config config) {
        this.config = config;
    }

    @Override
    public DateTimeZone getDefaultTimeZone() {
        String id = config.getString("exam.application.timezone");
        return DateTimeZone.forID(id);
    }

    @Override
    public String getHostName() {
        return config.getString("exam.application.hostname");
    }

    @Override
    public Integer getMaxFileSize() {
        return config.getInt("exam.attachment.maxsize");
    }

    @Override
    public String getExamMaxDate() {
        DateTime newDate = new DateTime(0);
        Period period = Period.parse(config.getString("exam.exam.maxDate"));
        return newDate.plus(period).toString();
    }

    @Override
    public List<Integer> getExamDurations() {
        String[] durations = config.getString("exam.exam.durations").split(",");
        return Arrays.stream(durations).map(Integer::parseInt).toList();
    }

    @Override
    public Integer getExamMaxDuration() {
        return config.getInt("exam.exam.maxDuration");
    }

    @Override
    public Integer getExamMinDuration() {
        return config.getInt("exam.exam.minDuration");
    }

    @Override
    public Map<Role, List<String>> getRoleMapping() {
        Role student = DB.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findOne();
        Role teacher = DB.find(Role.class).where().eq("name", Role.Name.TEACHER.toString()).findOne();
        Role admin = DB.find(Role.class).where().eq("name", Role.Name.ADMIN.toString()).findOne();
        Map<Role, List<String>> roles = new HashMap<>();
        roles.put(student, config.getStringList("exam.roles.student"));
        roles.put(teacher, config.getStringList("exam.roles.teacher"));
        roles.put(admin, config.getStringList("exam.roles.admin"));
        return roles;
    }

    @Override
    public boolean isCourseGradeScaleOverridable() {
        return config.getBoolean("exam.course.gradescale.overridable");
    }

    @Override
    public boolean isEnrolmentPermissionCheckActive() {
        return config.getBoolean("exam.integration.enrolmentPermissionCheck.active");
    }

    @Override
    public boolean isVisitingExaminationSupported() {
        return config.getBoolean("exam.integration.iop.visit.active");
    }

    @Override
    public boolean isCollaborationExaminationSupported() {
        return config.getBoolean("exam.integration.iop.collaboration.active");
    }

    @Override
    public boolean isHomeExaminationSupported() {
        return config.getBoolean("exam.byod.home.active");
    }

    @Override
    public boolean isSebExaminationSupported() {
        return config.getBoolean("exam.byod.seb.active");
    }

    @Override
    public boolean isCourseSearchActive() {
        return config.getBoolean("exam.integration.courseUnitInfo.active");
    }

    @Override
    public Map<String, String> getCourseIntegrationUrls() {
        Config urls = config.getConfig("exam.integration.courseUnitInfo.url");
        return urls.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().render()));
    }

    @Override
    public DateTime getExamExpirationDate(DateTime timeOfSubmission) {
        String expiresAfter = config.getString("exam.exam.expiration.period");
        Period period = Period.parse(expiresAfter);
        return timeOfSubmission.plus(period);
    }

    @Override
    public DateTime getCourseValidityDate(DateTime startDate) {
        String window = config.getString("exam.integration.courseUnitInfo.window");
        Period period = Period.parse(window);
        return startDate.minus(period);
    }

    @Override
    public String getExamExpirationPeriod() {
        return config.getString("exam.exam.expiration.period");
    }

    @Override
    public boolean isMaturitySupported() {
        return DB
            .find(ExamExecutionType.class)
            .where()
            .eq("type", ExamExecutionType.Type.MATURITY.toString())
            .findOneOrEmpty()
            .isPresent();
    }

    @Override
    public boolean isPrintoutSupported() {
        return DB
            .find(ExamExecutionType.class)
            .where()
            .eq("type", ExamExecutionType.Type.PRINTOUT.toString())
            .findOneOrEmpty()
            .isPresent();
    }

    @Override
    public String getAppVersion() {
        return config.getString("exam.release.version");
    }

    @Override
    public boolean isAnonymousReviewEnabled() {
        return config.getBoolean("exam.exam.anonymousReview");
    }

    @Override
    public String getQuitExaminationLink() {
        return config.getString("exam.exam.seb.quitLink");
    }

    @Override
    public String getExaminationAdminPassword() {
        return config.getBoolean("exam.exam.seb.adminPwd.randomize")
            ? UUID.randomUUID().toString()
            : config.getString("exam.exam.seb.adminPwd.value");
    }

    @Override
    public String getSettingsPasswordEncryptionKey() {
        return config.getString("exam.exam.seb.settingsPwd.encryption.key");
    }

    @Override
    public String getQuitPassword() {
        return config.getString("exam.exam.seb.quitPwd");
    }

    @Override
    public String getHomeOrganisationRef() {
        return config.getString("exam.integration.iop.organisationRef");
    }

    @Override
    public Integer getMaxByodExaminationParticipantCount() {
        return config.getInt("exam.byod.maxConcurrentParticipants");
    }

    @Override
    public String getCourseCodePrefix() {
        return config.getString("exam.course.code.prefix");
    }

    @Override
    public String getIopHost() {
        return config.getString("exam.integration.iop.host");
    }

    @Override
    public boolean isApiKeyUsed() {
        return config.getBoolean("exam.integration.apiKey.enabled");
    }

    @Override
    public String getApiKeyName() {
        return config.getString("exam.integration.apiKey.name");
    }

    @Override
    public String getApiKeyValue() {
        return config.getString("exam.integration.apiKey.value");
    }

    @Override
    public String getPermissionCheckUserIdentifier() {
        return config.getString("exam.integration.enrolmentPermissionCheck.id");
    }

    @Override
    public String getPermissionCheckUrl() {
        return config.getString("exam.integration.enrolmentPermissionCheck.url");
    }

    @Override
    public String getBaseSystemUrl() {
        return config.getString("exam.baseSystemURL");
    }

    @Override
    public String getSystemAccount() {
        return config.getString("exam.email.system.account");
    }

    @Override
    public String getAttachmentPath() {
        return config.getString("exam.attachments.path");
    }

    @Override
    public String getLoginType() {
        return config.getString("exam.login");
    }

    @Override
    public boolean isMultiStudentIdEnabled() {
        return config.getBoolean("exam.user.studentIds.multiple.enabled");
    }

    @Override
    public String getMultiStudentOrganisations() {
        return config.getString("exam.user.studentIds.multiple.organisations");
    }

    @Override
    public String getCsrfCookie() {
        return config.getString("play.filters.csrf.cookie.name");
    }

    @Override
    public boolean hasPath(String path) {
        return config.hasPath(path);
    }

    @Override
    public String getString(String path) {
        return config.getString(path);
    }
}
