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

import java.util.ArrayList;
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

public class ConfigUtil {

    public static DateTimeZone getDefaultTimeZone() {
        String config = ConfigFactory.load().getString("sitnet.application.timezone");
        return DateTimeZone.forID(config);
    }

    public static String getHostName() {
        return ConfigFactory.load().getString("sitnet.application.hostname");
    }

    public static Integer getMaxFileSize() {
        return ConfigFactory.load().getInt("sitnet.attachment.maxsize");
    }

    public static List<Integer> getExamDurations() {
        String[] durations = ConfigFactory.load().getString("sitnet.exam.durations").split(",");
        List<Integer> values = new ArrayList<>();
        for (String d : durations) {
            values.add(Integer.parseInt(d));
        }
        return values;
    }

    public static Map<Role, List<String>> getRoleMapping() {
        Role student = Ebean.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findOne();
        Role teacher = Ebean.find(Role.class).where().eq("name", Role.Name.TEACHER.toString()).findOne();
        Role admin = Ebean.find(Role.class).where().eq("name", Role.Name.ADMIN.toString()).findOne();
        Map<Role, List<String>> roles = new HashMap<>();
        roles.put(student, ConfigFactory.load().getStringList("sitnet.roles.student"));
        roles.put(teacher, ConfigFactory.load().getStringList("sitnet.roles.teacher"));
        roles.put(admin, ConfigFactory.load().getStringList("sitnet.roles.admin"));
        return roles;
    }

    public static Boolean isCourseGradeScaleOverridable() {
        return ConfigFactory.load().getBoolean("sitnet.course.gradescale.overridable");
    }

    public static Boolean isEnrolmentPermissionCheckActive() {
        return ConfigFactory.load().getBoolean("sitnet.integration.enrolmentPermissionCheck.active");
    }

    public static boolean isVisitingExaminationSupported() {
        return ConfigFactory.load().getBoolean("sitnet.integration.iop.visit.active");
    }

    public static boolean isCollaborationExaminationSupported() {
        return ConfigFactory.load().getBoolean("sitnet.integration.iop.collaboration.active");
    }

    public static boolean isCourseSearchActive() {
        return ConfigFactory.load().getBoolean("sitnet.integration.courseUnitInfo.active");
    }

    public static Map<String, String> getCourseIntegrationUrls() {
        Config config = ConfigFactory.load().getConfig("sitnet.integration.courseUnitInfo.url");
        return config.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().render()));
    }

    public static DateTime getExamExpirationDate(DateTime timeOfSubmission) {
        String expiresAfter = ConfigFactory.load().getString("sitnet.exam.expiration.period");
        Period period = Period.parse(expiresAfter);
        return timeOfSubmission.plus(period);
    }

    public static String getExamExpirationPeriod() {
        return ConfigFactory.load().getString("sitnet.exam.expiration.period");
    }

    public static boolean isMaturitySupported() {
        return Ebean.find(ExamExecutionType.class)
                .where()
                .eq("type", ExamExecutionType.Type.MATURITY.toString())
                .findCount() == 1;
    }

    public static boolean isPrintoutSupported() {
        return Ebean.find(ExamExecutionType.class)
                .where()
                .eq("type", ExamExecutionType.Type.PRINTOUT.toString())
                .findCount() == 1;
    }


    public static String getAppVersion() {
        return ConfigFactory.load().getString("exam.release.version");
    }

    public static boolean isAnonymousReviewEnabled() {
        return ConfigFactory.load().getBoolean("sitnet.exam.anonymousReview");
    }

}
