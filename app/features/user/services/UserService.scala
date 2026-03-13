// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

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

  def grantUserPermission(userId: String, permissionString: String): Either[UserError, Unit] =
    Option(DB.find(classOf[User], userId)) match
      case None => Left(UserNotFound)
      case Some(user) =>
        if !user.permissions.asScala.exists(_.value == permissionString) then
          PermissionType.values().find(_.name() == permissionString) match
            case Some(permType) =>
              DB.find(classOf[Permission]).where().eq("type", permType).find match
                case Some(permission) =>
                  user.permissions.add(permission)
                  user.update()
                  Right(())
                case None => Left(PermissionNotFound)
            case None => Left(InvalidPermissionType)
        else Right(())

  def revokeUserPermission(userId: String, permissionString: String): Either[UserError, Unit] =
    Option(DB.find(classOf[User], userId)) match
      case None => Left(UserNotFound)
      case Some(user) =>
        if user.permissions.asScala.exists(_.value == permissionString) then
          PermissionType.values().find(_.name() == permissionString) match
            case Some(permType) =>
              DB.find(classOf[Permission]).where().eq("type", permType).find match
                case Some(permission) =>
                  user.permissions.remove(permission)
                  user.update()
                  Right(())
                case None => Left(PermissionNotFound)
            case None => Left(InvalidPermissionType)
        else Right(())

  def listUsers(filter: Option[String]): (Seq[User], PathProperties) =
    val pp    = PathProperties.parse("(*, roles(*), permissions(*))")
    val query = DB.find(classOf[User])
    pp.apply(query)

    val results = filter match
      case Some(f) =>
        val baseQuery      = query.where().disjunction()
        val withNameSearch = userHandler.applyNameSearch(null, baseQuery, f)
        val condition      = s"%$f%"
        withNameSearch
          .ilike("email", condition)
          .ilike("userIdentifier", condition)
          .ilike("employeeNumber", condition)
          .endJunction()
          .orderBy("lastName, firstName")
          .list
      case None =>
        query.orderBy("lastName, firstName").list

    (results, pp)

  def addRole(uid: Long, roleName: String): Either[UserError, Unit] =
    Option(DB.find(classOf[User], uid)) match
      case None => Left(UserNotFound)
      case Some(user) =>
        if !user.roles.asScala.exists(_.name == roleName) then
          DB.find(classOf[Role]).where().eq("name", roleName).find match
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
          DB.find(classOf[Role]).where().eq("name", roleName).find match
            case None => Left(RoleNotFound)
            case Some(role) =>
              user.roles.remove(role)
              user.update()
              Right(())
        else Right(())

  def listUsersByRole(role: String): (Seq[User], PathProperties) =
    val pp    = PathProperties.parse("(*, roles(*), permissions(*))")
    val users = DB.find(classOf[User]).where().eq("roles.name", role).orderBy("lastName").list
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
    val enrolments = DB.find(classOf[ExamEnrolment]).where().eq("exam.id", eid).list
    val users      = listUsersByRoleAndName("STUDENT", criteria).asJava
    users.removeAll(enrolments.map(_.user).asJava)
    users.asScala.toSeq

  def updateUserAgreementAccepted(userId: Long): Either[UserError, Unit] =
    DB.find(classOf[User])
      .fetch("roles", "name")
      .fetch("language")
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
    val baseQuery      = DB.find(classOf[User]).where().eq("roles.name", role).disjunction()
    val withNameSearch = userHandler.applyNameSearch(null, baseQuery, nameFilter)
    withNameSearch.endJunction().list
