// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

import database.EbeanPaths.{path, props}
import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.ExamEnrolment
import models.user.*
import services.user.UserHandler

import javax.inject.Inject
import scala.jdk.CollectionConverters.*

import UserError.*

class UserService @Inject() (userHandler: UserHandler) extends EbeanQueryExtensions:

  def listPermissions: Seq[Permission] =
    DB.find(classOf[Permission]).list

  def grantUserPermission(userId: Long, permissionString: String): Either[UserError, Unit] =
    Option(DB.find(classOf[User], userId)) match
      case None => Left(UserNotFound)
      case Some(user) =>
        if !user.permissions.asScala.exists(_.value == permissionString) then
          PermissionType.values().find(_.name() == permissionString) match
            case Some(permType) =>
              DB.find(classOf[Permission]).where().eq(path[Permission]("type"), permType).find match
                case Some(permission) =>
                  user.permissions.add(permission)
                  user.update()
                  Right(())
                case None => Left(PermissionNotFound)
            case None => Left(InvalidPermissionType)
        else Right(())

  def revokeUserPermission(userId: Long, permissionString: String): Either[UserError, Unit] =
    Option(DB.find(classOf[User], userId)) match
      case None => Left(UserNotFound)
      case Some(user) =>
        if user.permissions.asScala.exists(_.value == permissionString) then
          PermissionType.values().find(_.name() == permissionString) match
            case Some(permType) =>
              DB.find(classOf[Permission]).where().eq(path[Permission]("type"), permType).find match
                case Some(permission) =>
                  user.permissions.remove(permission)
                  user.update()
                  Right(())
                case None => Left(PermissionNotFound)
            case None => Left(InvalidPermissionType)
        else Right(())

  def listUsers(filter: Option[String]): (Seq[User], PathProperties) =
    val pp    = props[User]("(*, roles(*), permissions(*))")
    val query = DB.find(classOf[User]).apply(pp)

    val results = filter match
      case Some(f) =>
        val baseQuery = query.where().disjunction()
        val withNameSearch =
          userHandler.applyNameSearch(path[User]("firstName"), path[User]("lastName"), baseQuery, f)
        val condition = s"%$f%"
        withNameSearch
          .ilike(path[User]("email"), condition)
          .ilike(path[User]("userIdentifier"), condition)
          .ilike(path[User]("employeeNumber"), condition)
          .endJunction()
          .orderBy()
          .asc(path[User]("lastName"))
          .orderBy()
          .asc(path[User]("firstName"))
          .list
      case None =>
        query
          .orderBy()
          .asc(path[User]("lastName"))
          .orderBy()
          .asc(path[User]("firstName"))
          .list

    (results, pp)

  def addRole(uid: Long, roleName: String): Either[UserError, Unit] =
    Option(DB.find(classOf[User], uid)) match
      case None => Left(UserNotFound)
      case Some(user) =>
        if !user.roles.asScala.exists(_.name == roleName) then
          DB.find(classOf[Role]).where().eq(path[Role]("name"), roleName).find match
            case None => Left(RoleNotFound)
            case Some(role) =>
              user.roles.add(role)
              user.update()
              Right(())
        else Right(())

  def removeRole(uid: Long, roleName: String): Either[UserError, Unit] =
    Option(DB.find(classOf[User], uid)) match
      case None => Left(UserNotFound)
      case Some(user) =>
        if user.roles.asScala.exists(_.name == roleName) then
          DB.find(classOf[Role]).where().eq(path[Role]("name"), roleName).find match
            case None => Left(RoleNotFound)
            case Some(role) =>
              user.roles.remove(role)
              user.update()
              Right(())
        else Right(())

  def listUsersByRole(role: String): (Seq[User], PathProperties) =
    val pp = props[User]("(*, roles(*), permissions(*))")
    val users = DB.find(classOf[User]).where().eq(path[User]("roles.name"), role).orderBy(
      path[User]("lastName")
    ).list
    (users, pp)

  def listQuestionOwners(
      role: String,
      criteria: String,
      qid: Option[Long],
      currentUser: User
  ): Seq[User] =
    val users = listUsersByRoleAndName(role, criteria).toSet
    val owners = qid
      .map(id => DB.find(classOf[User]).where().idIn(List(id).asJava).distinct.toList.toSet)
      .getOrElse(Set.empty[User]) + currentUser
    (users -- owners).toSeq

  def listTeachers(criteria: String): Seq[User] =
    listUsersByRoleAndName(Role.Name.TEACHER.toString, criteria)

  def listUnenrolledStudents(eid: Long, criteria: String): Seq[User] =
    val enrolments =
      DB.find(classOf[ExamEnrolment]).where().eq(path[ExamEnrolment]("exam.id"), eid).list
    val users           = listUsersByRoleAndName("STUDENT", criteria)
    val enrolledUserIds = enrolments.map(_.user.id).toSet
    users.filterNot(u => enrolledUserIds.contains(u.id))

  def updateUserAgreementAccepted(userId: Long): Either[UserError, Unit] =
    DB.find(classOf[User])
      .fetch(path[User]("roles"), "name")
      .fetch(path[User]("language"))
      .where()
      .idEq(userId)
      .find match
      case None => Left(UserNotFound)
      case Some(user) =>
        user.userAgreementAccepted = true
        user.update()
        Right(())

  def updateLanguage(userId: Long, lang: String): Either[UserError, Unit] =
    Option(DB.find(classOf[Language], lang)) match
      case None => Left(UnsupportedLanguage)
      case Some(language) =>
        Option(DB.find(classOf[User], userId)) match
          case None => Left(UserNotFound)
          case Some(user) =>
            user.language = language
            user.update()
            Right(())

  private def listUsersByRoleAndName(role: String, nameFilter: String): Seq[User] =
    val baseQuery = DB.find(classOf[User]).where().eq(path[User]("roles.name"), role).disjunction()
    val withNameSearch = userHandler.applyNameSearch(
      path[User]("firstName"),
      path[User]("lastName"),
      baseQuery,
      nameFilter
    )
    withNameSearch.endJunction().list
