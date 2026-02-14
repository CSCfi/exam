// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.user.services.SessionError.*
import io.ebean.DB
import models.enrolment.{ExamEnrolment, Reservation}
import models.facility.Organisation
import models.user.*
import org.apache.commons.codec.digest.DigestUtils
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Minutes}
import play.api.libs.json.{JsValue, Json}
import play.api.{Environment, Logger}
import repository.EnrolmentRepository
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.datetime.DateTimeHandler
import services.exam.ExternalExamHandler

import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Date
import javax.inject.Inject
import javax.mail.internet.InternetAddress
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

class SessionService @Inject() (
    environment: Environment,
    externalExamHandler: ExternalExamHandler,
    configReader: ConfigReader,
    enrolmentRepository: EnrolmentRepository,
    dateTimeHandler: DateTimeHandler
)(implicit ec: BlockingIOExecutionContext)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions:

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

  def login(
      loginType: String,
      headers: Map[String, Seq[String]],
      body: Option[JsValue],
      remoteAddress: String
  ): Future[Either[SessionError, LoginResponse]] =
    loginType match
      case "HAKA"  => hakaLogin(headers, remoteAddress)
      case "DEBUG" => devLogin(headers, body, remoteAddress)
      case _       => Future.successful(Left(LoginTypeNotSupported))

  private def hakaLogin(
      headers: Map[String, Seq[String]],
      remoteAddress: String
  ): Future[Either[SessionError, LoginResponse]] =
    parse(headers.get("eppn").flatMap(_.headOption)) match
      case None => Future.successful(Left(NoCredentials))
      case Some(eppn) =>
        val externalReservation = getUpcomingExternalReservation(eppn, remoteAddress)
        val isTemporaryVisitor  = externalReservation.isDefined
        val userIsLocal         = isLocalUser(eppn)
        val homeOrgRequired     = configReader.isHomeOrganisationRequired

        if !isTemporaryVisitor && !userIsLocal && homeOrgRequired then
          Future.successful(Left(DisallowedLogin))
        else
          val userResult = DB.find(classOf[User]).where().eq("eppn", eppn).find match
            case Some(u) => updateUser(u, headers).map(_ => u)
            case None    => createNewUser(eppn, headers, isTemporaryVisitor)

          userResult match
            case Right(u) =>
              u.setLastLogin(new Date())
              u.save()
              associateWithPreEnrolments(u)
              handleExternalReservationAndCreateSession(
                u,
                externalReservation,
                headers,
                remoteAddress
              )
            case Left(error) =>
              logger.error(s"Login failed: ${error.message}")
              val headerStr =
                headers.map { case (k, v) => s"$k: ${v.mkString(",")}" }.mkString("\n")
              logger.error(s"Received following request headers: $headerStr")
              Future.successful(Left(error))

  private def devLogin(
      headers: Map[String, Seq[String]],
      body: Option[JsValue],
      remoteAddress: String
  ): Future[Either[SessionError, LoginResponse]] =
    if environment.mode == play.api.Mode.Prod then
      logger.warn(
        "Developer login mode is enabled in production environment. This should only be used for testing!"
      )

    body match
      case None => Future.successful(Left(Unauthenticated))
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
                val externalReservation = getUpcomingExternalReservation(u.getEppn, remoteAddress)
                handleExternalReservationAndCreateSession(
                  u,
                  externalReservation,
                  headers,
                  remoteAddress
                )
              case None =>
                Future.successful(Left(Unauthenticated))
          case _ =>
            Future.successful(Left(Unauthenticated))

  private def handleExternalReservationAndCreateSession(
      user: User,
      reservation: Option[Reservation],
      headers: Map[String, Seq[String]],
      remoteAddress: String
  ): Future[Either[SessionError, LoginResponse]] = reservation match
    case Some(res) =>
      Try(handleExternalReservation(user, res)) match
        case Success(future) =>
          future.flatMap { _ =>
            createSession(user, isTemporaryVisitor = true, headers, remoteAddress)
          }
        case Failure(_) =>
          Future.successful(Left(FailedToHandleExternalReservation))
    case None => createSession(user, isTemporaryVisitor = false, headers, remoteAddress)

  private def isUserPreEnrolled(mail: String, user: User): Boolean =
    mail.equalsIgnoreCase(user.getEmail) || mail.equalsIgnoreCase(user.getEppn)

  private def associateWithPreEnrolments(user: User): Unit =
    DB.find(classOf[ExamEnrolment])
      .where()
      .isNotNull("preEnrolledUserEmail")
      .distinct
      .toList
      .filter(ee => isUserPreEnrolled(ee.getPreEnrolledUserEmail, user))
      .foreach { ee =>
        ee.setPreEnrolledUserEmail(null)
        ee.setUser(user)
        ee.update()
      }

  private def getUpcomingExternalReservation(
      eppn: String,
      remoteAddress: String
  ): Option[Reservation] =
    val now = dateTimeHandler.adjustDST(new DateTime())
    val lookAheadMinutes =
      Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes
    val future = now.plusMinutes(lookAheadMinutes)
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

  private def handleExternalReservation(user: User, reservation: Reservation): Future[Unit] =
    DB.find(classOf[ExamEnrolment]).where().eq("reservation", reservation).find match
      case Some(_) =>
        // already imported
        Future.successful(())
      case None =>
        reservation.setUser(user)
        reservation.update()
        externalExamHandler.requestEnrolment(user, reservation).flatMap {
          case Some(_) => Future.successful(())
          case None    => Future.failed(new RuntimeException("Failed to request enrolment"))
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
    if !configReader.isMultiStudentIdEnabled || !src.startsWith(URN_PREFIX) then
      src.substring(src.lastIndexOf(":") + 1)
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
            logger.error(
              s"Duplicate user identifier key for values $values. It will be marked with a null string"
            )
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

  private def parseDisplayName(headers: Map[String, Seq[String]]): Option[String] =
    parse(headers.get("displayName").flatMap(_.headOption)).map { n =>
      if n.indexOf(" ") > 0 then n.substring(0, n.lastIndexOf(" ")) else n
    }

  private def parseGivenName(headers: Map[String, Seq[String]]): Either[SessionError, String] =
    parse(headers.get("givenName").flatMap(_.headOption))
      .orElse(parseDisplayName(headers))
      .toRight(ValidationError("Missing given name"))

  private def findOrganisation(attribute: String): Option[Organisation] =
    DB.find(classOf[Organisation]).where().eq("code", attribute).find

  private def updateUser(
      user: User,
      headers: Map[String, Seq[String]]
  ): Either[SessionError, Unit] =
    user.setOrganisation(
      parse(headers.get("homeOrganisation").flatMap(_.headOption))
        .flatMap(findOrganisation)
        .orNull
    )
    user.setUserIdentifier(
      parse(headers.get("schacPersonalUniqueCode").flatMap(_.headOption))
        .map(parseUserIdentifier)
        .orNull
    )

    // Grant BYOD permission automatically for teachers if configuration so mandates
    if user.hasRole(
        Role.Name.TEACHER
      ) && configReader.isByodExamCreationPermissionGrantedForNewUsers
    then
      val permission = DB
        .find(classOf[Permission])
        .where()
        .eq("type", Permission.Type.CAN_CREATE_BYOD_EXAM)
        .findOne()
      user.getPermissions.add(permission)

    val email = parse(headers.get("mail").flatMap(_.headOption))
      .flatMap(validateEmail)
      .toRight(ValidationError("invalid mail address"))

    val lastName = parse(headers.get("sn").flatMap(_.headOption))
      .toRight(ValidationError("Missing last name"))

    val firstName = parseGivenName(headers)

    (email, lastName, firstName) match
      case (Right(e), Right(ln), Right(fn)) =>
        user.setEmail(e)
        user.setLastName(ln)
        user.setFirstName(fn)
        user.setEmployeeNumber(parse(headers.get("employeeNumber").flatMap(_.headOption)).orNull)
        user.setLogoutUrl(parse(headers.get("logouturl").flatMap(_.headOption)).orNull)
        Right(())
      case (Left(e), _, _) => Left(e)
      case (_, Left(e), _) => Left(e)
      case (_, _, Left(e)) => Left(e)

  private def createNewUser(
      eppn: String,
      headers: Map[String, Seq[String]],
      ignoreRoleNotFound: Boolean
  ): Either[SessionError, User] =
    val user = new User()
    val rolesResult = parse(headers.get("unscoped-affiliation").flatMap(_.headOption))
      .toRight(ValidationError("role not found"))
      .flatMap(parseRoles(_, ignoreRoleNotFound))

    rolesResult.flatMap { roles =>
      user.getRoles.addAll(roles.asJava)
      user.setLanguage(
        getLanguage(parse(headers.get("preferredLanguage").flatMap(_.headOption)).orNull)
      )
      user.setEppn(eppn)
      updateUser(user, headers).map(_ => user)
    }

  private def isLocalUser(eppn: String): Boolean =
    val userDomain  = eppn.split("@").last
    val homeDomains = configReader.getHomeOrganisations
    homeDomains.isEmpty || homeDomains.contains(userDomain)

  private def createSession(
      user: User,
      isTemporaryVisitor: Boolean,
      headers: Map[String, Seq[String]],
      remoteAddress: String
  ): Future[Either[SessionError, LoginResponse]] =
    val userData = Json.obj(
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

    val studentRole =
      Option(DB.find(classOf[Role]).where().eq("name", Role.Name.STUDENT.toString).findOne)
        .getOrElse(throw new IllegalStateException("Student role not found"))
    val isLocalAccount = isLocalUser(user.getEppn)
    val roles =
      if isTemporaryVisitor || !isLocalAccount then Seq(studentRole)
      else user.getRoles.asScala.toSeq

    val (rolePayload, responseData) =
      if isTemporaryVisitor then
        // External exam taker
        (
          Map("visitingStudent" -> "true", "role" -> studentRole.getName),
          Map.empty[String, JsValue]
        )
      else if !isLocalAccount then
        // External account - may only login as students
        (
          Map("role"            -> studentRole.getName),
          Map("externalUserOrg" -> Json.toJson(user.getEppn.split("@")(1)))
        )
      else if user.getRoles.size() == 1 then
        // Local account with a single role - automatically set it
        (Map("role" -> user.getRoles.asScala.head.getName), Map.empty[String, JsValue])
      else
        // Local account with multiple roles: don't set role, let user choose via setLoginRole
        (Map.empty[String, String], Map.empty[String, JsValue])

    val sessionData = basePayload ++ permissionsPayload ++ rolePayload
    val finalUserData = responseData
      .foldLeft(userData) { case (acc, (k, v)) => acc + (k -> v) } + ("roles" -> Json.toJson(
      roles.map(_.asJson)
    ))

    Future.successful(Right(LoginResponse(finalUserData, sessionData)))

  private def parseRoles(
      attribute: String,
      ignoreRoleNotFound: Boolean
  ): Either[SessionError, Set[Role]] =
    val userRoles = attribute
      .split(";")
      .flatMap { affiliation =>
        configReader.getRoleMappingJava.asScala.collect {
          case (role, affiliations) if affiliations.asScala.contains(affiliation) => role
        }
      }
      .toSet

    if userRoles.isEmpty && !ignoreRoleNotFound then
      Left(ValidationError(s"i18n_error_role_not_found $attribute"))
    else Right(userRoles)

  def logout(userId: Option[Long]): Either[SessionError, LogoutResponse] =
    userId match
      case Some(id) =>
        Option(DB.find(classOf[User], id)) match
          case Some(user) if Option(user.getLogoutUrl).isDefined =>
            Right(LogoutResponse(Some(user.getLogoutUrl)))
          case _ =>
            Right(LogoutResponse(None))
      case None =>
        Right(LogoutResponse(None))

  def setLoginRole(
      userId: Long,
      roleName: String,
      headers: Map[String, Seq[String]],
      remoteAddress: String
  ): Future[Either[SessionError, Role]] =
    Option(DB.find(classOf[User], userId)) match
      case None => Future.successful(Left(UserNotFound))
      case Some(user) =>
        DB.find(classOf[Role]).where().eq("name", roleName).find match
          case None => Future.successful(Left(RoleNotFound))
          case Some(role) =>
            if !user.getRoles.contains(role) then Future.successful(Left(UserDoesNotHaveRole))
            else Future.successful(Right(role))

  def extendSession: SessionData =
    Map("since" -> ISODateTimeFormat.dateTime().print(DateTime.now()))

  def checkSession(
      since: Option[String],
      headers: Map[String, Seq[String]],
      remoteAddress: String
  ): Future[Either[SessionError, CheckSessionStatus]] =
    since match
      case None =>
        logger.info("Session not found")
        Future.successful(Right(CheckSessionStatus.NoSession))
      case Some(s) =>
        val expirationTime =
          ISODateTimeFormat.dateTimeParser().parseDateTime(s).plusMinutes(SESSION_TIMEOUT_MINUTES)
        val alarmTime = expirationTime.minusMinutes(2)
        logger.debug(s"Session expiration due at $expirationTime")

        if expirationTime.isBeforeNow then
          logger.info("Session has expired")
          Future.successful(Right(CheckSessionStatus.NoSession))
        else
          val status =
            if alarmTime.isBeforeNow then CheckSessionStatus.Alarm else CheckSessionStatus.Valid
          Future.successful(Right(status))

  def updateSessionWithReservationHeaders(
      sessionData: SessionData,
      reservationHeaders: Map[String, String]
  ): SessionData =
    val toAdd = SESSION_HEADER_MAP.collect {
      case (headerKey, sessionKey) if reservationHeaders.contains(headerKey) =>
        (sessionKey, reservationHeaders(headerKey))
    }
    val toRemove = SESSION_HEADER_MAP.values.filterNot(sessionKey => toAdd.contains(sessionKey))
    sessionData -- toRemove ++ toAdd

  def isStudent(sessionData: SessionData): Boolean =
    sessionData.get("role").contains(Role.Name.STUDENT.toString)

  private def parse(src: Option[String]): Option[String] =
    src.filter(_.nonEmpty).map(URLDecoder.decode(_, StandardCharsets.UTF_8))
