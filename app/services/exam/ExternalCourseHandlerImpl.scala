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
import org.joda.time.DateTime
import org.springframework.beans.BeanUtils
import play.api.Logging
import play.api.libs.json.{JsResultException, JsValue, Json}
import play.api.libs.ws.{WSClient, WSResponse}
import play.mvc.Http
import schema.ExternalCourseValidator.{CourseUnitInfo, GradeScale as ExtGradeScale}
import security.BlockingIOExecutionContext
import services.config.ConfigReader

import java.net.*
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
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
  private val DF                      = new SimpleDateFormat("yyyyMMdd")
  private val BOM = ByteString.fromArray(Array[Byte](0xef.toByte, 0xbb.toByte, 0xbf.toByte))

  private def getLocalCourses(code: String) = DB
    .find(classOf[Course])
    .where
    .ilike("code", code + "%")
    .disjunction
    .isNull("endDate")
    .gt("endDate", DateTime.now)
    .endJunction
    .orderBy("code")
    .distinct
    .filter(c =>
      Option(c.getStartDate).isEmpty || configReader.getCourseValidityDate(
        new DateTime(c.getStartDate)
      ).isBeforeNow
    )

  override def getCoursesByCode(user: User, code: String): Future[Set[Course]] =
    if !configReader.isCourseSearchActive then Future(getLocalCourses(code))
    // Hit the remote end for possible matches. Update local records with matching remote records.
    // Finally, return all matches (local and remote)
    val url = parseUrl(user.getOrganisation, code)
    downloadCourses(url).map(externals =>
      externals.foreach(saveOrUpdate)
      TreeSet.empty[Course](
        using (a, b) => a.getCode.compareTo(b.getCode)
      ) ++ externals ++ getLocalCourses(code)
    )

  override def getPermittedCourses(user: User): Future[Set[String]] =
    val url = parseUrl(user)
    queryRequest(url)
      .get()
      .map(response =>
        val root  = response.json
        val nodes = root \ "data" \\ "course_code" ++ root \ "data" \\ "courseUnitCode"
        nodes.map(_.as[String]).toSet
      )
      .recover { case e: Exception =>
        logger.error(
          "Unable to check for permitted courses due to exception in network connection",
          e
        )
        Set.empty
      }

  private def saveOrUpdate(external: Course): Unit =
    DB.find(classOf[Course])
      .where
      .eq("code", external.getCode)
      .find match
      case Some(local) =>
        // Existing course
        if Option(external.getCourseImplementation).nonEmpty then
          // update only those courses that specify an implementation
          BeanUtils.copyProperties(external, local, "id", "objectVersion")
          local.update()
        external.setId(local.getId)
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
      node.asOpt[CourseUnitInfo].toSeq ++ node.asOpt[Seq[CourseUnitInfo]].getOrElse(Seq.empty)
    }.toSeq

  private def parseCourse(cui: CourseUnitInfo): Option[Course] =
    (validateStart(cui.startDate), validateEnd(cui.endDate)) match
      case (Right(start), Right(end)) => // good to go
        val model = new Course
        model.setStartDate(start.map(_.toDate).orNull)
        model.setEndDate(end.map(_.toDate).orNull)
        model.setIdentifier(cui.identifier)
        model.setName(cui.title)
        model.setCode(cui.code)
        model.setCourseImplementation(cui.implementation.orElse(cui.altImplementation).orNull)
        model.setLevel(cui.level.orNull)
        model.setCourseUnitType(cui.`type`.orNull)
        // This is interesting trying to pass an optional to Java's nullable number
        model.setCredits(if cui.credits.nonEmpty then cui.credits.get else null)
        val org = DB.find(classOf[Organisation]).where.ieq("name", cui.institutionName).find match
          case None =>
            val org2 = new Organisation
            org2.setName(cui.institutionName)
            org2.save()
            org2
          case Some(org) => org

        model.setOrganisation(org)
        model.setCampus(cui.campus.map(_.head.name).orNull)
        model.setDegreeProgramme(cui.programme.map(_.head.name).orNull)
        model.setDepartment(cui.department.map(_.head.name).orNull)
        model.setLecturerResponsible(cui.responsible.map(_.head.name).orNull)
        model.setLecturer(cui.lecturer.map(_.head.name).orNull)
        model.setCreditsLanguage(cui.language.map(_.head.name).orNull)
        model.setGradeScale(importScales(cui).headOption.orNull)
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
        model.setDescription(GradeScale.Type.OTHER.toString)
        model.setExternalRef(code)
        model.setDisplayName(name)
        logger.info(s"saving scale $code")
        model.save()
        model.setGrades(
          grades.values
            .map(g =>
              val g2 = new Grade
              g2.setName(g.description)
              g2.setMarksRejection(g.isFailed)
              g2.setGradeScale(model)
              g2.save()
              g2
            )
            .toSet
            .asJava
        )
        Some(model)
      }
    case _ => None

  private def validateStart(date: Option[String]) = date match
    case None => Right(None)
    case Some(d) =>
      val date  = new DateTime(DF.parse(d))
      val limit = configReader.getCourseValidityDate(date)
      if limit.isAfterNow then Left("too soon") else Right(Some(date))

  private def validateEnd(date: Option[String]) = date match
    case None => Right(None)
    case Some(d) =>
      val date = new DateTime(DF.parse(d))
      if date.isBeforeNow then Left("too late") else Right(Some(date))

  private def queryRequest(url: URL) =
    val host = url.toString.split("\\?").head
    val query =
      url.getQuery.split("&").collectFirst { case s"$k=$v" =>
        k -> URLDecoder.decode(v, StandardCharsets.UTF_8)
      }
    val request = query match
      case None     => wsClient.url(host)
      case Some(qp) => wsClient.url(host).withQueryStringParameters(qp)
    if configReader.isApiKeyUsed then
      val header = (configReader.getApiKeyName, configReader.getApiKeyValue)
      request.addHttpHeaders(header)
    else request

  private def parseUrl(organisation: Organisation, courseCode: String) =
    val urlConfigPrefix = "exam.integration.courseUnitInfo.url"
    val configPathForOrg =
      Option(organisation)
        .flatMap(o => Option(o.getCode))
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
        user.getUserIdentifier
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
            user.getUserIdentifier
          else user.getEppn,
          StandardCharsets.UTF_8
        )
        val patched = url
          .replace(USER_ID_PLACEHOLDER, identifier)
          .replace(USER_LANG_PLACEHOLDER, user.getLanguage.getCode)
        URI.create(patched).toURL
