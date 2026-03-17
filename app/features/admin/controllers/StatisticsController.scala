// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.controllers

import database.EbeanJsonExtensions
import features.admin.services.StatisticsService
import models.user.Role
import org.apache.pekko.stream.scaladsl.StreamConverters
import play.api.libs.json.Json
import play.api.mvc.*
import security.Auth.authorized
import security.BlockingIOExecutionContext
import system.AuditedAction
import validation.CommaJoinedListValidator
import validation.core.{ScalaAttrs, Validators}

import java.io.{PipedInputStream, PipedOutputStream}
import javax.inject.Inject
import scala.concurrent.Future

class StatisticsController @Inject() (
    val controllerComponents: ControllerComponents,
    private val statisticsService: StatisticsService,
    validators: Validators,
    audited: AuditedAction,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def listDepartments: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val departments = statisticsService.listDepartments
      Ok(Json.obj("departments" -> Json.toJson(departments)))
    }

  def listParticipations(
      dept: Option[String],
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val roomMap = statisticsService.listParticipations(dept, start, end)
      Ok(Json.toJson(roomMap))
    }

  def listReservations(
      dept: Option[String],
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val (noShows, appearances) = statisticsService.listReservations(dept, start, end)
      Ok(Json.obj("noShows" -> noShows, "appearances" -> appearances))
    }

  def listIopReservations(
      dept: Option[String],
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val reservations = statisticsService.listIopReservations(dept, start, end)
      Ok(reservations.asJson)
    }

  def listPublishedExams(
      dept: Option[String],
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val infos = statisticsService.listPublishedExams(dept, start, end)
      Ok(Json.toJson(infos))
    }

  def listResponses(
      dept: Option[String],
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val (aborted, assessed, unassessed) = statisticsService.listResponses(dept, start, end)
      Ok(Json.obj("aborted" -> aborted, "assessed" -> assessed, "unassessed" -> unassessed))
    }

  def exportExamQuestionScoresAsExcel(examId: Long): Action[AnyContent] =
    Action
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER)))
      .andThen(validators.validated(CommaJoinedListValidator))
      .andThen(audited)
      .async { request =>
        val childIds = request.attrs(ScalaAttrs.ID_LIST)
        val pos      = new PipedOutputStream()
        val pis      = new PipedInputStream(pos)
        Future {
          try statisticsService.streamExamQuestionScoresAsExcel(examId, childIds)(pos)
          finally pos.close()
        }(using ec)
        Future.successful(
          Ok.chunked(StreamConverters.fromInputStream(() => pis))
            .as(XLSX_MIME)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.xlsx\"")
        )
      }
