// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.config

import com.google.inject.ImplementedBy
import models.admin.GeneralSettings
import models.user.Role
import org.joda.time.DateTime
import org.joda.time.DateTimeZone

import scala.jdk.CollectionConverters._

@ImplementedBy(classOf[ConfigReaderImpl])
trait ConfigReader:
  def getOrCreateSettings(
      name: String,
      value: Option[String],
      defaultValue: Option[String]
  ): GeneralSettings
  def getDefaultTimeZone: DateTimeZone
  def getHostName: String
  def getMaxFileSize: Int
  def getExamDurations: List[Int]
  def getExamDurationsJava: java.util.List[Integer] = getExamDurations.map(Integer.valueOf).asJava
  def getExamMaxDuration: Int
  def getExamMinDuration: Int
  def getRoleMapping: Map[Role, List[String]]
  def getRoleMappingJava: java.util.Map[Role, java.util.List[String]] =
    getRoleMapping.map((k, v) => k -> v.asJava).asJava
  def isCourseGradeScaleOverridable: Boolean
  def isEnrolmentPermissionCheckActive: Boolean
  def isVisitingExaminationSupported: Boolean
  def isCollaborationExaminationSupported: Boolean
  def isHomeExaminationSupported: Boolean
  def isSebExaminationSupported: Boolean
  def isCourseSearchActive: Boolean
  def getCourseIntegrationUrls: Map[String, String]
  def getExamExpirationDate(timeOfSubmission: DateTime): DateTime
  def getCourseValidityDate(startDate: DateTime): DateTime
  def getExamExpirationPeriod: String
  def isMaturitySupported: Boolean
  def isPrintoutSupported: Boolean
  def getAppVersion: String
  def isAnonymousReviewEnabled: Boolean
  def getQuitExaminationLink: String
  def getExaminationAdminPassword: String
  def getSettingsPasswordEncryptionKey: String
  def getHomeOrganisationRef: String
  def getMaxByodExaminationParticipantCount: Int
  def isByodExamCreationPermissionGrantedForNewUsers: Boolean
  def getCourseCodePrefix: String
  def getIopHost: String
  def isApiKeyUsed: Boolean
  def getApiKeyName: String
  def getApiKeyValue: String
  def getPermissionCheckUserIdentifier: String
  def getPermissionCheckUrl: String
  def getBaseSystemUrl: String
  def getSystemAccount: String
  def getAttachmentPath: String
  def getLoginType: String
  def getCsrfCookie: String
  def isMultiStudentIdEnabled: Boolean
  def getMultiStudentOrganisations: String
  def getSupportedLanguages: List[String]
  def getHomeOrganisations: List[String]
  def isHomeOrganisationRequired: Boolean
  def areNewMultichoiceFeaturesEnabled: Boolean
  def hasPath(path: String): Boolean
  def getString(path: String): String
  def isLocalUser(eppn: String): Boolean
