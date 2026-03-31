// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.exam

import database.EbeanQueryExtensions
import io.ebean.DB
import models.exam.{Course, Grade, GradeScale}
import models.facility.Organisation
import models.user.User
import org.apache.pekko.util.ByteString
import play.api.Logging
import play.api.libs.json.*
import play.api.libs.ws.{WSClient, WSResponse}
import play.mvc.Http
import schema.ExternalCourseValidator.{CourseUnitInfo, GradeScale as ExtGradeScale}
import security.BlockingIOExecutionContext
import services.config.ConfigReader

import java.net.*
import java.nio.charset.StandardCharsets
import java.time.format.DateTimeFormatter
import java.time.{Instant, ZoneOffset}
import javax.inject.Inject
import scala.collection.immutable.TreeSet
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Try

class ExternalCourseHandlerImpl @Inject (
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    implicit val ec: BlockingIOExecutionContext
) extends ExternalCourseHandler
    with EbeanQueryExtensions
    with Logging:

  private val COURSE_CODE_PLACEHOLDER = "${course_code}"
  private val USER_ID_PLACEHOLDER     = "${employee_number}"
  private val USER_LANG_PLACEHOLDER   = "${employee_lang}"
  private val DF                      = DateTimeFormatter.ofPattern("yyyyMMdd")
  private val BOM = ByteString.fromArray(Array[Byte](0xef.toByte, 0xbb.toByte, 0xbf.toByte))

  private def getLocalCourses(code: String) = DB
    .find(classOf[Course])
    .where
    .ilike("code", code + "%")
    .disjunction
    .isNull("endDate")
    .gt("endDate", Instant.now())
    .endJunction
    .orderBy("code")
    .distinct
    .filter(c =>
      Option(c.startDate).isEmpty || configReader.getCourseValidityDate(
        c.startDate.toInstant
      ).isBefore(Instant.now())
    )

  override def getCoursesByCode(user: User, code: String): Future[Set[Course]] =
    if !configReader.isCourseSearchActive then Future(getLocalCourses(code))
    // Hit the remote end for possible matches. Update local records with matching remote records.
    // Finally, return all matches (local and remote)
    else
      val url = parseUrl(user.organisation, code)
      downloadCourses(url).map(externals =>
        externals.foreach(saveOrUpdate)
        TreeSet.empty[Course](
          using (a, b) => a.code.compareTo(b.code)
        ) ++ externals ++ getLocalCourses(code)
      )

  override def getPermittedCourses(user: User): Future[Set[String]] =
    val url = parseUrl(user)
    queryRequest(url)
      .get()
      .map(response =>
        parseResponseBody(response) match
          case Some(root) =>
            val nodes = root \ "data" \\ "course_code" ++ root \ "data" \\ "courseUnitCode"
            nodes.map(_.as[String]).toSet
          case None => Set.empty
      )
      .recover {
        case e: JsResultException =>
          logger.error(
            "Unable to parse permitted courses data: JSON structure did not match expected format",
            e
          )
          Set.empty
        case e: Exception =>
          logger.error(
            "Unable to check for permitted courses due to exception in network connection",
            e
          )
          Set.empty
      }

  private def saveOrUpdate(external: Course): Unit =
    DB.find(classOf[Course])
      .where
      .eq("code", external.code)
      .find match
      case Some(local) =>
        // Existing course
        if Option(external.courseImplementation).nonEmpty then
          // update only those courses that specify an implementation
          local.code = external.code
          local.name = external.name
          local.level = external.level
          local.credits = external.credits
          local.courseUnitType = external.courseUnitType
          local.identifier = external.identifier
          local.startDate = external.startDate
          local.endDate = external.endDate
          local.courseImplementation = external.courseImplementation
          local.creditsLanguage = external.creditsLanguage
          local.gradeScale = external.gradeScale
          local.lecturer = external.lecturer
          local.lecturerResponsible = external.lecturerResponsible
          local.institutionName = external.institutionName
          local.department = external.department
          local.degreeProgramme = external.degreeProgramme
          local.campus = external.campus
          local.courseMaterial = external.courseMaterial
          local.organisation = external.organisation
          local.update()
        external.id = local.id
      case _ => external.save()

  private def parseResponseBody(response: WSResponse): Option[JsValue] =
    val bytes = response.bodyAsBytes
    val bodyBytes =
      if bytes.length >= 3 && bytes.splitAt(3)._1 == BOM then
        logger.warn("BOM character detected in the beginning of response body")
        bytes.drop(3)
      else bytes
    val body = bodyBytes.utf8String.trim
    if body.startsWith("<") then
      logger.warn("Response is not JSON (e.g. HTML error page). Body starts with '<'.")
      None
    else
      Try(Json.parse(bodyBytes.toArray)).toOption match
        case None =>
          logger.warn("Response was not valid JSON (e.g. HTML error page).")
          None
        case some => some

  private def downloadCourses(url: URL) =
    queryRequest(url)
      .get()
      .map(response =>
        val status = response.status
        if status == Http.Status.OK then
          parseResponseBody(response) match
            case Some(root) => parseCourses(root).flatMap(parseCourse)
            case None       => Seq.empty
        else
          logger.info(s"Non-OK response received for URL: %url. Status: $status")
          Seq.empty
      )
      .recover {
        case e: JsResultException =>
          logger.error(
            "Unable to parse course data: JSON structure did not match expected format",
            e
          )
          Seq.empty
        case e: Exception =>
          logger.error("Unable to download course data due to exception in network connection", e)
          Seq.empty
      }

  private def parseCourses(root: JsValue): Seq[CourseUnitInfo] =
    (root \\ "CourseUnitInfo").flatMap { node =>
      node.validate[CourseUnitInfo] match
        case JsSuccess(cui, _) => Seq(cui)
        case JsError(_) =>
          node.validate[Seq[CourseUnitInfo]] match
            case JsSuccess(cuis, _) => cuis
            case JsError(errors) =>
              logger.warn(s"Failed to parse CourseUnitInfo: ${JsError.toJson(errors)}")
              Seq.empty
    }.toSeq

  private def parseCourse(cui: CourseUnitInfo): Option[Course] =
    (validateStart(cui.startDate), validateEnd(cui.endDate)) match
      case (Right(start), Right(end)) => // good to go
        val model = new Course
        model.startDate = start.map(java.util.Date.from).orNull
        model.endDate = end.map(java.util.Date.from).orNull
        model.identifier = cui.identifier
        model.name = cui.title
        model.code = cui.code
        model.courseImplementation = cui.implementation.orElse(cui.altImplementation).orNull
        model.level = cui.level.orNull
        model.courseUnitType = cui.`type`.orNull
        // This is interesting trying to pass an optional to Java's nullable number
        model.credits = if cui.credits.nonEmpty then cui.credits.get else null
        val org = DB.find(classOf[Organisation]).where.ieq("name", cui.institutionName).find match
          case None =>
            val org2 = new Organisation
            org2.name = cui.institutionName
            org2.save()
            org2
          case Some(org) => org

        model.organisation = org
        model.campus = cui.campus.flatMap(_.headOption).map(_.name).orNull
        model.degreeProgramme = cui.programme.flatMap(_.headOption).map(_.name).orNull
        model.department = cui.department.flatMap(_.headOption).map(_.name).orNull
        model.lecturerResponsible = cui.responsible.flatMap(_.headOption).map(_.name).orNull
        model.lecturer = cui.lecturer.flatMap(_.headOption).map(_.name).orNull
        model.creditsLanguage = cui.language.flatMap(_.headOption).map(_.name).orNull
        model.gradeScale = importScales(cui).headOption.orNull
        Some(model)
      case _ => None

  private def importScales(cui: CourseUnitInfo) =
    val (ext, loc) =
      cui.gradeScales.map(_.partition(_.`type` == "OTHER")).getOrElse((Seq.empty, Seq.empty))
    ext.flatMap(importScale) ++ loc.flatMap(gs =>
      DB.find(classOf[GradeScale]).where.eq("description", gs.`type`).find
    )

  private def importScale(gs: ExtGradeScale) = gs match
    case ExtGradeScale(Some(name), "OTHER", Some(code), Some(grades)) =>
      DB.find(classOf[GradeScale]).where.eq("externalRef", code).find.orElse {
        val model = new GradeScale
        model.description = GradeScale.Type.OTHER.toString
        model.externalRef = code
        model.displayName = name
        logger.info(s"saving scale $code")
        model.save()
        model.grades =
          grades.values
            .map(g =>
              val g2 = new Grade
              g2.name = g.description
              g2.marksRejection = g.isFailed
              g2.gradeScale = model
              g2.save()
              g2
            )
            .toSet
            .asJava

        Some(model)
      }
    case _ => None

  private def validateStart(date: Option[String]) = date match
    case None => Right(None)
    case Some(d) =>
      val instant = java.time.LocalDate.parse(d, DF).atStartOfDay(ZoneOffset.UTC).toInstant
      val limit   = configReader.getCourseValidityDate(instant)
      if limit.isAfter(Instant.now()) then Left("too soon") else Right(Some(instant))

  private def validateEnd(date: Option[String]) = date match
    case None => Right(None)
    case Some(d) =>
      val instant = java.time.LocalDate.parse(d, DF).atStartOfDay(ZoneOffset.UTC).toInstant
      if instant.isBefore(Instant.now()) then Left("too late") else Right(Some(instant))

  private def queryRequest(url: URL) =
    val host        = url.toString.split("\\?").head
    val queryString = Option(url.getQuery).getOrElse("")
    val params = queryString
      .split("&")
      .flatMap { part =>
        part.split("=", 2) match
          case Array(k, v) =>
            Some(URLDecoder.decode(k.trim, StandardCharsets.UTF_8) -> URLDecoder.decode(
              v,
              StandardCharsets.UTF_8
            ))
          case _ => None
      }
      .toSeq
    val request =
      if params.isEmpty then wsClient.url(host)
      else wsClient.url(host).withQueryStringParameters(params*)
    if configReader.isApiKeyUsed then
      val header = (configReader.getApiKeyName, configReader.getApiKeyValue)
      request.addHttpHeaders(header)
    else request

  private def parseUrl(organisation: Organisation, courseCode: String) =
    val urlConfigPrefix = "exam.integration.courseUnitInfo.url"
    val configPathForOrg =
      Option(organisation)
        .flatMap(o => Option(o.code))
        .flatMap(c => Option(s"$urlConfigPrefix.$c").filter(configReader.hasPath))
    val configPath = configPathForOrg.orElse {
      val path = String.format("%s.%s", urlConfigPrefix, "default")
      Some(path).filter(configReader.hasPath)
    }
    val path = configReader.getString(configPath.getOrElse(""))
    if (!path.contains(COURSE_CODE_PLACEHOLDER))
      throw new RuntimeException("exam.integration.courseUnitInfo.url is malformed")
    val url =
      path.replace(COURSE_CODE_PLACEHOLDER, URLEncoder.encode(courseCode, StandardCharsets.UTF_8))
    URI.create(url).toURL

  private def parseUrl(user: User) =
    if configReader.getPermissionCheckUserIdentifier == "userIdentifier" && Option(
        user.userIdentifier
      ).isEmpty
    then
      throw new MalformedURLException("User has no identifier number!")
    val url =
      Option(configReader.getPermissionCheckUrl).filter(_.contains(USER_ID_PLACEHOLDER))
    url match
      case None => throw new MalformedURLException(
          "exam.integration.enrolmentPermissionCheck.url is malformed"
        )
      case Some(url) =>
        val identifier = URLEncoder.encode(
          if (configReader.getPermissionCheckUserIdentifier == "userIdentifier")
            user.userIdentifier
          else user.eppn,
          StandardCharsets.UTF_8
        )
        val patched = url
          .replace(USER_ID_PLACEHOLDER, identifier)
          .replace(USER_LANG_PLACEHOLDER, user.language.code)
        URI.create(patched).toURL
