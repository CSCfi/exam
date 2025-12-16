// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

import database.EbeanQueryExtensions
import features.facility.services.ExamMachineError.*
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.Reservation
import models.facility.{ExamMachine, ExamRoom, Software}
import org.joda.time.DateTime
import play.api.libs.json.JsValue

import javax.inject.Inject

class ExamMachineService @Inject() () extends EbeanQueryExtensions:

  private val defaultPathProperties = PathProperties.parse("(*, softwareInfo(*), room(name, buildingName))")

  def getExamMachines: List[ExamMachine] =
    DB.find(classOf[ExamMachine]).where().eq("archived", false).list

  def getExamMachine(id: Long): Either[ExamMachineError, (ExamMachine, PathProperties)] =
    val pp    = defaultPathProperties
    val query = DB.find(classOf[ExamMachine])
    pp.apply(query)
    query.where().idEq(id).find match
      case None          => Left(MachineNotFound)
      case Some(machine) => Right((machine, pp))

  def getExamMachineReservationsFromNow(id: Long): List[Reservation] =
    DB.find(classOf[Reservation])
      .where()
      .eq("machine.id", id)
      .gt("endAt", DateTime.now())
      .list

  def updateExamMachine(id: Long, body: JsValue): Either[ExamMachineError, (ExamMachine, PathProperties)] =
    Option(DB.find(classOf[ExamMachine], id)) match
      case None       => Left(MachineNotFound)
      case Some(dest) =>
        // Check for IP address conflicts
        val ipConflict = (body \ "ipAddress").asOpt[String].filter(_.nonEmpty).flatMap { newIp =>
          val existingIps = DB
            .find(classOf[ExamMachine])
            .list
            .filter(m => !m.equals(dest))
            .flatMap(m => Option(m.getIpAddress))

          if existingIps.contains(newIp) then Some(IpAddressConflict("i18n_error_ip_address_exists_for_room"))
          else None
        }

        ipConflict match
          case Some(error) => Left(error)
          case None =>
            (body \ "name").asOpt[String].foreach(dest.setName)
            (body \ "otherIdentifier").asOpt[String].foreach(dest.setOtherIdentifier)
            (body \ "accessibilityInfo").asOpt[String].foreach(dest.setAccessibilityInfo)
            (body \ "accessible").asOpt[Boolean].foreach(v => dest.setAccessible(v))
            (body \ "ipAddress").asOpt[String].foreach(dest.setIpAddress)
            (body \ "surveillanceCamera").asOpt[String].foreach(dest.setSurveillanceCamera)
            (body \ "videoRecordings").asOpt[String].foreach(dest.setVideoRecordings)
            (body \ "expanded").asOpt[Boolean].foreach(v => dest.setExpanded(v))
            (body \ "statusComment").asOpt[String].foreach(dest.setStatusComment)
            (body \ "outOfService").asOpt[Boolean].foreach(v => dest.setOutOfService(v))

            dest.update()
            Right((dest, defaultPathProperties))

  def resetMachineSoftware(mid: Long): Either[ExamMachineError, (ExamMachine, PathProperties)] =
    Option(DB.find(classOf[ExamMachine], mid)) match
      case None => Left(MachineNotFound)
      case Some(machine) =>
        machine.getSoftwareInfo.clear()
        machine.update()
        Right((machine, defaultPathProperties))

  def updateMachineSoftware(mid: Long, sid: Long): Either[ExamMachineError, Boolean] =
    Option(DB.find(classOf[ExamMachine], mid)) match
      case None => Left(MachineNotFound)
      case Some(machine) =>
        Option(DB.find(classOf[Software], sid)) match
          case None => Left(SoftwareNotFound)
          case Some(software) =>
            val isTurnedOn =
              if machine.getSoftwareInfo.contains(software) then
                machine.getSoftwareInfo.remove(software)
                false
              else
                machine.getSoftwareInfo.add(software)
                true

            machine.update()
            Right(isTurnedOn)

  def insertExamMachine(id: Long): Either[ExamMachineError, ExamMachine] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Left(RoomNotFound)
      case Some(room) =>
        val machine = new ExamMachine()
        room.getExamMachines.add(machine)
        room.save()
        machine.save()
        Right(machine)

  def removeExamMachine(id: Long): Either[ExamMachineError, Unit] =
    // SIT-690
    Left(ExamMachineError.IpAddressConflict("Machine removal is not allowed"))

  def listSoftware: List[Software] =
    DB.find(classOf[Software])
      .where()
      .or()
      .isNull("status")
      .eq("status", "ACTIVE")
      .endOr()
      .list

  def getSoftware(id: Long): Either[ExamMachineError, Software] =
    Option(DB.find(classOf[Software], id)) match
      case None           => Left(SoftwareNotFound)
      case Some(software) => Right(software)

  def addSoftware(name: String): Either[ExamMachineError, Software] =
    checkSoftwareName(name) match
      case Some(error) => Left(error)
      case None =>
        val software = new Software()
        software.setName(name)
        software.save()
        Right(software)

  def updateSoftware(id: Long, name: String): Either[ExamMachineError, Software] =
    Option(DB.find(classOf[Software], id)) match
      case None => Left(SoftwareNotFound)
      case Some(software) =>
        checkSoftwareName(name) match
          case Some(error) => Left(error)
          case None =>
            software.setName(name)
            software.update()
            Right(software)

  def removeSoftware(id: Long): Either[ExamMachineError, Unit] =
    Option(DB.find(classOf[Software], id)) match
      case None => Left(SoftwareNotFound)
      case Some(software) =>
        software.delete()
        Right(())

  private def checkSoftwareName(name: String): Option[ExamMachineError] =
    val existing = DB.find(classOf[Software]).where().ieq("name", name).list
    if existing.isEmpty then None
    else Some(SoftwareNameConflict("Software with that name already exists"))
