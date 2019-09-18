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

package backend.util.config;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Period;

import backend.models.ExamExecutionType;
import backend.models.Role;

public class ConfigReaderImpl implements ConfigReader {

    @Override
    public DateTimeZone getDefaultTimeZone() {
        String config = ConfigFactory.load().getString("sitnet.application.timezone");
        return DateTimeZone.forID(config);
    }

    @Override
    public String getHostName() {
        return ConfigFactory.load().getString("sitnet.application.hostname");
    }

    @Override
    public Integer getMaxFileSize() {
        return ConfigFactory.load().getInt("sitnet.attachment.maxsize");
    }

    @Override
    public List<Integer> getExamDurations() {
        String[] durations = ConfigFactory.load().getString("sitnet.exam.durations").split(",");
        return Arrays.stream(durations).map(Integer::parseInt).collect(Collectors.toList());
    }

    @Override
    public Map<Role, List<String>> getRoleMapping() {
        Role student = Ebean.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findOne();
        Role teacher = Ebean.find(Role.class).where().eq("name", Role.Name.TEACHER.toString()).findOne();
        Role admin = Ebean.find(Role.class).where().eq("name", Role.Name.ADMIN.toString()).findOne();
        Map<Role, List<String>> roles = new HashMap<>();
        roles.put(student, ConfigFactory.load().getStringList("sitnet.roles.student"));
        roles.put(teacher, ConfigFactory.load().getStringList("sitnet.roles.teacher"));
        roles.put(admin, ConfigFactory.load().getStringList("sitnet.roles.admin"));
        return roles;
    }

    @Override
    public boolean isCourseGradeScaleOverridable() {
        return ConfigFactory.load().getBoolean("sitnet.course.gradescale.overridable");
    }

    @Override
    public boolean isEnrolmentPermissionCheckActive() {
        return ConfigFactory.load().getBoolean("sitnet.integration.enrolmentPermissionCheck.active");
    }

    @Override
    public boolean isVisitingExaminationSupported() {
        return ConfigFactory.load().getBoolean("sitnet.integration.iop.visit.active");
    }

    @Override
    public boolean isCollaborationExaminationSupported() {
        return ConfigFactory.load().getBoolean("sitnet.integration.iop.collaboration.active");
    }

    @Override
    public boolean isCourseSearchActive() {
        return ConfigFactory.load().getBoolean("sitnet.integration.courseUnitInfo.active");
    }

    @Override
    public Map<String, String> getCourseIntegrationUrls() {
        Config config = ConfigFactory.load().getConfig("sitnet.integration.courseUnitInfo.url");
        return config.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().render()));
    }

    @Override
    public DateTime getExamExpirationDate(DateTime timeOfSubmission) {
        String expiresAfter = ConfigFactory.load().getString("sitnet.exam.expiration.period");
        Period period = Period.parse(expiresAfter);
        return timeOfSubmission.plus(period);
    }

    @Override
    public String getExamExpirationPeriod() {
        return ConfigFactory.load().getString("sitnet.exam.expiration.period");
    }

    @Override
    public boolean isMaturitySupported() {
        return Ebean.find(ExamExecutionType.class)
                .where()
                .eq("type", ExamExecutionType.Type.MATURITY.toString())
                .findCount() == 1;
    }

    @Override
    public boolean isPrintoutSupported() {
        return Ebean.find(ExamExecutionType.class)
                .where()
                .eq("type", ExamExecutionType.Type.PRINTOUT.toString())
                .findCount() == 1;
    }

    @Override
    public String getAppVersion() {
        return ConfigFactory.load().getString("exam.release.version");
    }

    @Override
    public boolean isAnonymousReviewEnabled() {
        return ConfigFactory.load().getBoolean("sitnet.exam.anonymousReview");
    }

    @Override
    public String getQuitExaminationLink() {
        return ConfigFactory.load().getString("sitnet.exam.seb.quitLink");
    }

    @Override
    public String getSettingsPasswordEncryptionKey() {
        return ConfigFactory.load().getString("sitnet.exam.seb.settingsPwd.encryption.key");
    }

    @Override
    public String getQuitPassword() {
        return ConfigFactory.load().getString("sitnet.exam.seb.quitPwd");
    }

    @Override
    public String getHomeOrganisationRef() {
        return ConfigFactory.load().getString("sitnet.integration.iop.organisationRef");
    }

}
