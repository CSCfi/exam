// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.services

import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.admin.GeneralSettings
import models.enrolment.ExamEnrolment
import models.user.{Language, User}
import play.api.libs.json._
import play.api.libs.ws.WSClient
import services.config.ConfigReader

import java.net.URI
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Try

class SettingsService @Inject() (
    private val configReader: ConfigReader,
    private val wsClient: WSClient
)(implicit ec: ExecutionContext)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions:

  private def get(name: String): GeneralSettings =
    DB.find(classOf[GeneralSettings])
      .where()
      .eq("name", name)
      .find
      .getOrElse(new GeneralSettings())

  def getUserAgreement: GeneralSettings =
    configReader.getOrCreateSettings("eula", None, None)

  def getDeadline: GeneralSettings =
    configReader.getOrCreateSettings("review_deadline", None, Some("14"))

  def getReservationWindowSize: GeneralSettings =
    configReader.getOrCreateSettings("reservation_window_size", None, Some("30"))

  def getMaturityInstructions(lang: String, hash: Option[String]): Future[Either[String, play.api.libs.json.JsValue]] =
    Option(DB.find(classOf[Language], lang)) match
      case None => Future.successful(Left("Language not supported"))
      case Some(language) =>
        hash match
          case Some(h) =>
            DB.find(classOf[ExamEnrolment])
              .where()
              .eq("externalExam.hash", h)
              .find match
              case None => Future.successful(Left("Enrolment not found"))
              case Some(enrolment) =>
                Try(parseExternalUrl(enrolment.getReservation.getExternalRef)).toOption match
                  case None => Future.successful(Left("Invalid external URL"))
                  case Some(url) =>
                    wsClient
                      .url(url.toString)
                      .addQueryStringParameters("lang" -> language.getCode)
                      .get()
                      .map { response =>
                        if response.status == 200 then Right(response.json)
                        else
                          Left(
                            (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                          )
                      }
          case None =>
            val key = s"maturity_instructions_$lang"
            Future.successful(Right(get(key).asJson))

  def provideMaturityInstructions(lang: String): Option[GeneralSettings] =
    Option(DB.find(classOf[Language], lang)) match
      case None => None
      case Some(_) =>
        val key = s"maturity_instructions_$lang"
        Some(get(key))

  def updateUserAgreement(value: String, minorUpdate: Boolean): GeneralSettings =
    val gs = configReader.getOrCreateSettings("eula", Some(value), None)

    if !minorUpdate then
      // Force users to accept EULA again
      val update = DB.createUpdate(classOf[User], "update app_user set user_agreement_accepted = :hasNot")
      update.set("hasNot", false)
      update.execute()

    gs

  def setDeadline(value: String): GeneralSettings =
    configReader.getOrCreateSettings("review_deadline", Some(value), None)

  def setReservationWindowSize(value: String): GeneralSettings =
    configReader.getOrCreateSettings("reservation_window_size", Some(value), None)

  def getHostname: String = configReader.getHostName

  def getMaxFilesize: Long = configReader.getMaxFileSize

  def getExamDurations: List[Int] = configReader.getExamDurations

  def getExamMaxDuration: Int = configReader.getExamMaxDuration

  def getExamMinDuration: Int = configReader.getExamMinDuration

  def isExamGradeScaleOverridable: Boolean = configReader.isCourseGradeScaleOverridable

  def isEnrolmentPermissionCheckActive: Boolean = configReader.isEnrolmentPermissionCheckActive

  def getAppVersion: String = configReader.getAppVersion

  def isProd: Boolean = configReader.getLoginType != "DEBUG"

  def isExamVisitSupported: Boolean = configReader.isVisitingExaminationSupported

  def isExamCollaborationSupported: Boolean = configReader.isCollaborationExaminationSupported

  def isAnonymousReviewEnabled: Boolean = configReader.isAnonymousReviewEnabled

  def getByodSupport: (Boolean, Boolean) =
    (configReader.isSebExaminationSupported, configReader.isHomeExaminationSupported)

  def getExaminationQuitLink: String = configReader.getQuitExaminationLink

  def getConfig: JsObject =
    val courseIntegrationUrls = JsObject(configReader.getCourseIntegrationUrls.toSeq.map { case (k, v) =>
      k -> JsString(v)
    })

    val roles = JsObject(
      configReader.getRoleMapping.map { case (k, v) => k.getName -> JsArray(v.map(JsString(_))) }.toSeq
    )

    val eula                  = configReader.getOrCreateSettings("eula", None, None)
    val reservationWindowSize = configReader.getOrCreateSettings("reservation_window_size", None, Some("30"))
    val reviewDeadline        = configReader.getOrCreateSettings("review_deadline", None, Some("14"))

    Json.obj(
      "hasCourseSearchIntegration"   -> configReader.isCourseSearchActive,
      "anonymousReviewEnabled"       -> configReader.isAnonymousReviewEnabled,
      "courseSearchIntegrationUrls"  -> courseIntegrationUrls,
      "examDurations"                -> configReader.getExamDurations,
      "roles"                        -> roles,
      "eula"                         -> eula.getValue,
      "reservationWindowSize"        -> reservationWindowSize.getValue.toInt,
      "reviewDeadline"               -> reviewDeadline.getValue.toInt,
      "isExamVisitSupported"         -> configReader.isVisitingExaminationSupported,
      "isExamCollaborationSupported" -> configReader.isCollaborationExaminationSupported,
      "hasEnrolmentCheckIntegration" -> configReader.isEnrolmentPermissionCheckActive,
      "isGradeScaleOverridable"      -> configReader.isCourseGradeScaleOverridable,
      "supportsMaturity"             -> configReader.isMaturitySupported,
      "supportsPrintouts"            -> configReader.isPrintoutSupported,
      "maxFileSize"                  -> configReader.getMaxFileSize,
      "expirationPeriod"             -> configReader.getExamExpirationPeriod,
      "defaultTimeZone"              -> configReader.getDefaultTimeZone.getID,
      "sebQuitLink"                  -> configReader.getQuitExaminationLink,
      "isSebExaminationSupported"    -> configReader.isSebExaminationSupported,
      "isHomeExaminationSupported"   -> configReader.isHomeExaminationSupported
    )

  def getCourseCodePrefix: String = configReader.getCourseCodePrefix

  def getByodMaxParticipants: Int = configReader.getMaxByodExaminationParticipantCount

  def areNewMultichoiceFeaturesEnabled: Boolean = configReader.areNewMultichoiceFeaturesEnabled

  private def parseExternalUrl(reservationRef: String): java.net.URL =
    URI
      .create(
        configReader.getIopHost + s"/api/enrolments/$reservationRef/instructions"
      )
      .toURL
