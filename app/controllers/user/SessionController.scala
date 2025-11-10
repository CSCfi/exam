// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.user

import impl.ExternalExamHandler
import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.{ExamEnrolment, Reservation}
import models.facility.Organisation
import models.user.{Language, Permission, Role, User}
import org.apache.commons.codec.digest.DigestUtils
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Minutes}
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.*
import play.api.{Environment, Logger}
import repository.EnrolmentRepository

import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Date
import javax.inject.Inject
import javax.mail.internet.{AddressException, InternetAddress}
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

class SessionController @Inject() (
    environment: Environment,
    externalExamHandler: ExternalExamHandler,
    configReader: ConfigReader,
    enrolmentRepository: EnrolmentRepository,
    dateTimeHandler: DateTimeHandler,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  private val logger = Logger(getClass)

  private val SESSION_TIMEOUT_MINUTES = 30
  private val URN_PREFIX              = "urn:"
  private val SESSION_HEADER_MAP = Map(
    "x-exam-start-exam"         -> "ongoingExamHash",
    "x-exam-upcoming-exam"      -> "upcomingExamHash",
    "x-exam-wrong-machine"      -> "wrongMachineData",
    "x-exam-unknown-machine"    -> "unknownMachineData",
    "x-exam-wrong-room"         -> "wrongRoomData",
    "x-exam-wrong-agent-config" -> "wrongAgent",
    "x-exam-aquarium-login"     -> "aquariumLogin"
  )

  def login(): Action[AnyContent] = Action.async { request =>
    configReader.getLoginType match
      case "HAKA"  => hakaLogin(request)
      case "DEBUG" => devLogin(request)
      case _       => Future.successful(BadRequest("login type not supported"))
  }

  private def hakaLogin(request: Request[AnyContent]): Future[Result] =
    parse(request.headers.get("eppn")) match
      case None => Future.successful(BadRequest("No credentials!"))
      case Some(eppn) =>
        val externalReservation = getUpcomingExternalReservation(eppn, request.remoteAddress)
        val isTemporaryVisitor  = externalReservation.isDefined
        val userIsLocal         = isLocalUser(eppn)
        val homeOrgRequired     = configReader.isHomeOrganisationRequired

        if !isTemporaryVisitor && !userIsLocal && homeOrgRequired then
          Future.successful(BadRequest("i18n_error_disallowed_login_with_external_domain_credentials"))
        else
          val user = Try {
            DB.find(classOf[User]).where().eq("eppn", eppn).find match
              case Some(u) =>
                updateUser(u, request)
                u
              case None => createNewUser(eppn, request, isTemporaryVisitor)
          }.recover { case e: Exception =>
            logger.error("Login failed", e)
            val headers = request.headers.toMap.map { case (k, v) => s"$k: ${v.mkString(",")}" }.mkString("\n")
            logger.error(s"Received following request headers: $headers")
            throw e
          }

          user match
            case Success(u) =>
              u.setLastLogin(new Date())
              u.save()
              associateWithPreEnrolments(u)
              handleExternalReservationAndCreateSession(u, externalReservation, request)
            case Failure(e: IllegalArgumentException) =>
              Future.successful(BadRequest(e.getMessage))
            case Failure(e: AddressException) =>
              Future.successful(BadRequest(e.getMessage))
            case Failure(_) =>
              Future.successful(BadRequest("Login failed"))

  private def devLogin(request: Request[AnyContent]): Future[Result] =
    if environment.mode == play.api.Mode.Prod then
      logger.warn("Developer login mode is enabled in production environment. This should only be used for testing!")

    request.body.asJson match
      case None => Future.successful(Unauthorized("i18n_error_unauthenticated"))
      case Some(json) =>
        val username = (json \ "username").asOpt[String]
        val password = (json \ "password").asOpt[String]

        (username, password) match
          case (Some(user), Some(pass)) =>
            logger.debug(s"User login with username: $user@funet.fi")
            val pwd = DigestUtils.md5Hex(pass)
            DB.find(classOf[User])
              .where()
              .eq("eppn", s"$user@funet.fi")
              .eq("password", pwd)
              .find match
              case Some(u) =>
                u.setLastLogin(new Date())
                u.update()
                val externalReservation = getUpcomingExternalReservation(u.getEppn, request.remoteAddress)
                handleExternalReservationAndCreateSession(u, externalReservation, request)
              case None =>
                Future.successful(Unauthorized("i18n_error_unauthenticated"))
          case _ =>
            Future.successful(Unauthorized("i18n_error_unauthenticated"))

  private def handleExternalReservationAndCreateSession(
      user: User,
      reservation: Option[Reservation],
      request: Request[AnyContent]
  ): Future[Result] = reservation match
    case Some(res) =>
      Try(handleExternalReservation(user, res)) match
        case Success(future) =>
          future.flatMap(_ => createSession(user, isTemporaryVisitor = true, request))
        case Failure(_) =>
          Future.successful(InternalServerError("Failed to handle external reservation"))
    case None => createSession(user, isTemporaryVisitor = false, request)

  private def isUserPreEnrolled(mail: String, user: User): Boolean =
    mail.equalsIgnoreCase(user.getEmail) || mail.equalsIgnoreCase(user.getEppn)

  private def associateWithPreEnrolments(user: User): Unit =
    DB.find(classOf[ExamEnrolment])
      .where()
      .isNotNull("preEnrolledUserEmail")
      .distinct
      .filter(ee => isUserPreEnrolled(ee.getPreEnrolledUserEmail, user))
      .foreach { ee =>
        ee.setPreEnrolledUserEmail(null)
        ee.setUser(user)
        ee.update()
      }

  private def getUpcomingExternalReservation(eppn: String, remoteAddress: String): Option[Reservation] =
    val now              = dateTimeHandler.adjustDST(new DateTime())
    val lookAheadMinutes = Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes
    val future           = now.plusMinutes(lookAheadMinutes)
    DB
      .find(classOf[Reservation])
      .where()
      .eq("externalUserRef", eppn)
      .isNotNull("externalRef")
      .le("startAt", future)
      .gt("endAt", now)
      .orderBy("startAt")
      .list
      .headOption

  private def handleExternalReservation(user: User, reservation: Reservation): Future[Result] =
    DB.find(classOf[ExamEnrolment]).where().eq("reservation", reservation).find match
      case Some(_) =>
        // already imported
        Future.successful(Ok)
      case None =>
        reservation.setUser(user)
        reservation.update()
        externalExamHandler.requestEnrolment(user, reservation).map {
          case Some(_) => Ok
          case None    => InternalServerError("Failed to request enrolment")
        }

  private def getLanguage(code: String): Language =
    val language = Option(code).flatMap { c =>
      val lcCode = c.split("-")(0).toLowerCase
      val lang   = if configReader.getSupportedLanguages.contains(lcCode) then lcCode else "en"
      Option(DB.find(classOf[Language], lang))
    }
    language.getOrElse(DB.find(classOf[Language], "en"))

  private def validateEmail(email: String): Option[String] =
    Try {
      new InternetAddress(email).validate()
      email
    }.toOption.orElse {
      logger.warn(s"User has invalid email: $email")
      None
    }

  private def parseStudentIdDomain(src: String): String =
    val attribute = src.substring(0, src.lastIndexOf(":"))
    attribute.substring(attribute.lastIndexOf(":") + 1)

  private def parseStudentIdValue(src: String): String =
    val value = src.substring(src.lastIndexOf(":") + 1)
    if value.isBlank then "null" else value

  private def parseUserIdentifier(src: String): String =
    if !configReader.isMultiStudentIdEnabled || !src.startsWith(URN_PREFIX) then src.substring(src.lastIndexOf(":") + 1)
    else
      src
        .split(";")
        .filter(s => (s.contains("int:") || s.contains("fi:")) && !s.contains("esi:"))
        .map { s =>
          val domain = parseStudentIdDomain(s)
          val value  = parseStudentIdValue(s)
          (domain, value)
        }
        .groupBy(_._1)
        .map { case (domain, entries) =>
          if entries.length > 1 then
            val values = entries.map(_._2).mkString(", ")
            logger.error(s"Duplicate user identifier key for values $values. It will be marked with a null string")
            (domain, "null")
          else (domain, entries.head._2)
        }
        .toSeq
        .sortBy { case (domain, _) =>
          val orgs = configReader.getMultiStudentOrganisations
          if !orgs.contains(domain) then 1000 else orgs.indexOf(domain)
        }
        .map { case (domain, value) => s"$domain:$value" }
        .mkString(" ")

  private def parseDisplayName(request: Request[AnyContent]): Option[String] =
    parse(request.headers.get("displayName")).map { n =>
      if n.indexOf(" ") > 0 then n.substring(0, n.lastIndexOf(" ")) else n
    }

  private def parseGivenName(request: Request[AnyContent]): String =
    parse(request.headers.get("givenName"))
      .orElse(parseDisplayName(request))
      .getOrElse(throw new IllegalArgumentException("Missing given name"))

  private def findOrganisation(attribute: String): Option[Organisation] =
    DB.find(classOf[Organisation]).where().eq("code", attribute).find

  private def updateUser(user: User, request: Request[AnyContent]): Unit =
    user.setOrganisation(
      parse(request.headers.get("homeOrganisation"))
        .flatMap(findOrganisation)
        .orNull
    )
    user.setUserIdentifier(
      parse(request.headers.get("schacPersonalUniqueCode"))
        .map(parseUserIdentifier)
        .orNull
    )

    // Grant BYOD permission automatically for teachers if configuration so mandates
    if user.hasRole(Role.Name.TEACHER) && configReader.isByodExamCreationPermissionGrantedForNewUsers then
      val permission = DB
        .find(classOf[Permission])
        .where()
        .eq("type", Permission.Type.CAN_CREATE_BYOD_EXAM)
        .findOne()
      user.getPermissions.add(permission)

    user.setEmail(
      parse(request.headers.get("mail"))
        .flatMap(validateEmail)
        .getOrElse(throw new AddressException("invalid mail address"))
    )

    user.setLastName(
      parse(request.headers.get("sn"))
        .getOrElse(throw new IllegalArgumentException("Missing last name"))
    )

    user.setFirstName(parseGivenName(request))
    user.setEmployeeNumber(parse(request.headers.get("employeeNumber")).orNull)
    user.setLogoutUrl(parse(request.headers.get("logouturl")).orNull)

  private def createNewUser(eppn: String, request: Request[AnyContent], ignoreRoleNotFound: Boolean): User =
    val user = new User()
    val roles = parseRoles(
      parse(request.headers.get("unscoped-affiliation"))
        .getOrElse(throw new IllegalArgumentException("role not found")),
      ignoreRoleNotFound
    )
    user.getRoles.addAll(roles.asJava)
    user.setLanguage(getLanguage(parse(request.headers.get("preferredLanguage")).orNull))
    user.setEppn(eppn)
    updateUser(user, request)
    user

  private def isLocalUser(eppn: String): Boolean =
    val userDomain  = eppn.split("@").last
    val homeDomains = configReader.getHomeOrganisations
    homeDomains.isEmpty || homeDomains.contains(userDomain)

  private def createSession(user: User, isTemporaryVisitor: Boolean, request: Request[AnyContent]): Future[Result] =
    val result = Json.obj(
      "id"                    -> user.getId.longValue,
      "firstName"             -> user.getFirstName,
      "lastName"              -> user.getLastName,
      "lang"                  -> user.getLanguage.getCode,
      "permissions"           -> user.getPermissions.asScala.asJson,
      "userAgreementAccepted" -> user.isUserAgreementAccepted,
      "userIdentifier"        -> user.getUserIdentifier,
      "email"                 -> user.getEmail
    )

    val basePayload = Map(
      "since" -> ISODateTimeFormat.dateTime().print(DateTime.now()),
      "id"    -> user.getId.toString,
      "email" -> user.getEmail
    )

    val permissionsPayload =
      if !user.getPermissions.isEmpty then
        Map("permissions" -> user.getPermissions.asScala.map(_.getValue).mkString(","))
      else Map.empty[String, String]

    val isLocal = isLocalUser(user.getEppn)
    val roles =
      if isTemporaryVisitor || !isLocal then DB.find(classOf[Role]).where().eq("name", Role.Name.STUDENT.toString).list
      else user.getRoles.asScala.toSeq

    val (rolePayload, resultUpdate) =
      if user.getRoles.size() == 1 && !isTemporaryVisitor then
        (Map("role" -> user.getRoles.asScala.head.getName), Map.empty[String, JsValue])
      else if isTemporaryVisitor then
        (Map("visitingStudent" -> "true", "role" -> roles.head.getName), Map.empty[String, JsValue])
      else if !isLocalUser(user.getEppn) then
        (Map("role" -> roles.head.getName), Map("externalUserOrg" -> Json.toJson(user.getEppn.split("@")(1))))
      else (Map.empty[String, String], Map.empty[String, JsValue])

    val payload = basePayload ++ permissionsPayload ++ rolePayload
    val updatedResult = resultUpdate
      .foldLeft(result) { case (acc, (k, v)) => acc + (k -> v) } + ("roles" -> Json.toJson(roles.map(_.asJson)))

    checkStudentSession(request, Session(payload), Ok(updatedResult: JsValue))

  def getAttributes: Action[AnyContent] = Action { request =>
    val node = request.headers.toMap.foldLeft(Json.obj()) { case (acc, (key, values)) =>
      acc + (key -> Json.toJson(values.mkString(", ")))
    }
    Ok(node)
  }

  private def parseRoles(attribute: String, ignoreRoleNotFound: Boolean): Set[Role] =
    val userRoles = attribute
      .split(";")
      .flatMap { affiliation =>
        configReader.getRoleMappingJava.asScala.collect {
          case (role, affiliations) if affiliations.asScala.contains(affiliation) => role
        }
      }
      .toSet

    if userRoles.isEmpty && !ignoreRoleNotFound then
      throw new IllegalArgumentException(s"i18n_error_role_not_found $attribute")

    userRoles

  def logout: Action[AnyContent] = Action { request =>
    val sessionData = request.session.data
    val result =
      if sessionData.nonEmpty then
        sessionData.get("id").flatMap(id => Try(id.toLong).toOption) match
          case Some(userId) =>
            Option(DB.find(classOf[User], userId)) match
              case Some(user) if user.getLogoutUrl != null =>
                val node = Json.obj("logoutUrl" -> user.getLogoutUrl)
                Ok(node).withNewSession.discardingCookies(DiscardingCookie("PLAY_SESSION"))
              case _ =>
                Ok.withNewSession.discardingCookies(DiscardingCookie("PLAY_SESSION"))
          case None =>
            Ok.withNewSession.discardingCookies(DiscardingCookie("PLAY_SESSION"))
      else Ok.withNewSession.discardingCookies(DiscardingCookie("PLAY_SESSION"))

    if environment.mode == play.api.Mode.Dev then result
    else result.discardingCookies(DiscardingCookie(configReader.getCsrfCookie))
  }

  def setLoginRole(roleName: String): Action[AnyContent] = Action.async { request =>
    request.session.get("id") match
      case None => Future.successful(Unauthorized("No session"))
      case Some(id) =>
        Try(id.toLong).toOption match
          case None => Future.successful(BadRequest("Invalid user ID"))
          case Some(userId) =>
            Option(DB.find(classOf[User], userId)) match
              case None => Future.successful(NotFound("User not found"))
              case Some(user) =>
                DB.find(classOf[Role]).where().eq("name", roleName).find match
                  case None => Future.successful(NotFound("Role not found"))
                  case Some(role) =>
                    if !user.getRoles.contains(role) then Future.successful(Forbidden("User does not have this role"))
                    else checkStudentSession(request, request.session + ("role" -> roleName), Ok(role.asJson))
  }

  def extendSession: Action[AnyContent] = Action { request =>
    Ok.withSession(request.session + ("since" -> ISODateTimeFormat.dateTime().print(DateTime.now())))
  }

  def checkSession: Action[AnyContent] = Action.async { request =>
    request.session.get("since") match
      case None =>
        logger.info("Session not found")
        Future.successful(Ok("no_session"))
      case Some(since) =>
        val expirationTime =
          ISODateTimeFormat.dateTimeParser().parseDateTime(since).plusMinutes(SESSION_TIMEOUT_MINUTES)
        val alarmTime = expirationTime.minusMinutes(2)
        logger.debug(s"Session expiration due at $expirationTime")

        if expirationTime.isBeforeNow then
          logger.info("Session has expired")
          Future.successful(Ok("no_session").withNewSession)
        else
          val reason = if alarmTime.isBeforeNow then "alarm" else ""
          checkStudentSession(request, request.session, Ok(reason))
  }

  private def checkStudentSession(request: Request[AnyContent], session: Session, result: Result): Future[Result] = {
    session.get("id") match
      case Some(id) if isStudent(session) =>
        val userId = session.get("id").get.toLong
        enrolmentRepository.getReservationHeaders(request, userId).map { headers =>
          val newSession = updateSession(session, headers)
          result.withSession(newSession)
        }
      case _ => Future.successful(result.withSession(session))
  }

  private def updateSession(session: Session, headers: Map[String, String]): Session =
    val toAdd = SESSION_HEADER_MAP.collect {
      case (headerKey, sessionKey) if headers.contains(headerKey) => (sessionKey, headers(headerKey))
    }
    val toRemove = SESSION_HEADER_MAP.values.filterNot(sessionKey => toAdd.contains(sessionKey))
    val payload  = session.data -- toRemove ++ toAdd
    Session(payload)

  private def isStudent(session: Session): Boolean =
    session.get("role").contains(Role.Name.STUDENT.toString)

  private def parse(src: Option[String]): Option[String] =
    src.filter(_.nonEmpty).map(URLDecoder.decode(_, StandardCharsets.UTF_8))
