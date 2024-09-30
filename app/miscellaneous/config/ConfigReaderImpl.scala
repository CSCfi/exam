// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.config

import com.typesafe.config.Config
import io.ebean.DB
import miscellaneous.scala.DbApiHelper
import models.exam.ExamExecutionType
import models.user.Role
import org.joda.time.{DateTime, DateTimeZone, Period}

import java.util.UUID
import javax.inject.Inject
import scala.jdk.CollectionConverters._

class ConfigReaderImpl @Inject (private val config: Config) extends ConfigReader with DbApiHelper:
  override def getDefaultTimeZone: DateTimeZone = {
    val id = config.getString("exam.application.timezone")
    DateTimeZone.forID(id)
  }
  override def getHostName: String = config.getString("exam.application.hostname")
  override def getMaxFileSize: Int = config.getInt("exam.attachment.maxsize")
  override def getExamDurations: List[Int] =
    config.getString("exam.exam.durations").split(",").map(_.toInt).toList

  override def getExamMaxDuration: Int = config.getInt("exam.exam.maxDuration")
  override def getExamMinDuration: Int = config.getInt("exam.exam.minDuration")
  override def getRoleMapping: Map[Role, List[String]] =
    val student = DB.find(classOf[Role]).where.eq("name", Role.Name.STUDENT.toString).findOne
    val teacher = DB.find(classOf[Role]).where.eq("name", Role.Name.TEACHER.toString).findOne
    val admin   = DB.find(classOf[Role]).where.eq("name", Role.Name.ADMIN.toString).findOne
    Map(
      student -> config.getStringList("exam.roles.student").asScala.toList,
      teacher -> config.getStringList("exam.roles.teacher").asScala.toList,
      admin   -> config.getStringList("exam.roles.admin").asScala.toList
    )

  override def isCourseGradeScaleOverridable: Boolean = config.getBoolean("exam.course.gradescale.overridable")
  override def isEnrolmentPermissionCheckActive: Boolean =
    config.getBoolean("exam.integration.enrolmentPermissionCheck.active")
  override def isVisitingExaminationSupported: Boolean = config.getBoolean("exam.integration.iop.visit.active")
  override def isCollaborationExaminationSupported: Boolean =
    config.getBoolean("exam.integration.iop.collaboration.active")
  override def isHomeExaminationSupported: Boolean = config.getBoolean("exam.byod.home.active")
  override def isSebExaminationSupported: Boolean  = config.getBoolean("exam.byod.seb.active")
  override def isCourseSearchActive: Boolean       = config.getBoolean("exam.integration.courseUnitInfo.active")
  override def getCourseIntegrationUrls: Map[String, String] =
    config
      .getConfig("exam.integration.courseUnitInfo.url")
      .entrySet()
      .asScala
      .map(e => e.getKey -> e.getValue.render)
      .toMap

  override def getExamExpirationDate(timeOfSubmission: DateTime): DateTime =
    val expiresAfter = config.getString("exam.exam.expiration.period")
    val period       = Period.parse(expiresAfter)
    timeOfSubmission.plus(period)
  override def getCourseValidityDate(startDate: DateTime): DateTime =
    val window = config.getString("exam.integration.courseUnitInfo.window")
    val period = Period.parse(window)
    startDate.minus(period)
  override def getExamExpirationPeriod: String = config.getString("exam.exam.expiration.period")
  override def isMaturitySupported: Boolean = DB
    .find(classOf[ExamExecutionType])
    .where
    .eq("type", ExamExecutionType.Type.MATURITY.toString)
    .find
    .nonEmpty
  override def isPrintoutSupported: Boolean = DB
    .find(classOf[ExamExecutionType])
    .where
    .eq("type", ExamExecutionType.Type.PRINTOUT.toString)
    .find
    .nonEmpty
  override def getAppVersion: String             = config.getString("exam.release.version")
  override def isAnonymousReviewEnabled: Boolean = config.getBoolean("exam.exam.anonymousReview")
  override def getQuitExaminationLink: String    = config.getString("exam.exam.seb.quitLink")
  override def getExaminationAdminPassword: String = if (config.getBoolean("exam.exam.seb.adminPwd.randomize"))
    UUID.randomUUID.toString
  else config.getString("exam.exam.seb.adminPwd.value")
  override def getSettingsPasswordEncryptionKey: String   = config.getString("exam.exam.seb.settingsPwd.encryption.key")
  override def getHomeOrganisationRef: String             = config.getString("exam.integration.iop.organisationRef")
  override def getMaxByodExaminationParticipantCount: Int = config.getInt("exam.byod.maxConcurrentParticipants")
  override def isByodExamCreationPermissionGrantedForNewUsers: Boolean =
    config.getBoolean("exam.byod.permission.allowed")
  override def getCourseCodePrefix: String = config.getString("exam.course.code.prefix")
  override def getIopHost: String          = config.getString("exam.integration.iop.host")
  override def isApiKeyUsed: Boolean       = config.getBoolean("exam.integration.apiKey.enabled")
  override def getApiKeyName: String       = config.getString("exam.integration.apiKey.name")
  override def getApiKeyValue: String      = config.getString("exam.integration.apiKey.value")
  override def getPermissionCheckUserIdentifier: String =
    config.getString("exam.integration.enrolmentPermissionCheck.id")
  override def getPermissionCheckUrl: String        = config.getString("exam.integration.enrolmentPermissionCheck.url")
  override def getBaseSystemUrl: String             = config.getString("exam.baseSystemURL")
  override def getSystemAccount: String             = config.getString("exam.email.system.account")
  override def getAttachmentPath: String            = config.getString("exam.attachments.path")
  override def getLoginType: String                 = config.getString("exam.login")
  override def isMultiStudentIdEnabled: Boolean     = config.getBoolean("exam.user.studentIds.multiple.enabled")
  override def getMultiStudentOrganisations: String = config.getString("exam.user.studentIds.multiple.organisations")
  override def getCsrfCookie: String                = config.getString("play.filters.csrf.cookie.name")
  override def getSupportedLanguages: List[String]  = config.getStringList("play.i18n.langs").asScala.toList
  override def hasPath(path: String): Boolean       = config.hasPath(path)
  override def getString(path: String): String      = config.getString(path)
