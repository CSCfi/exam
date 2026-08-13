// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonIgnore}
import jakarta.persistence.*
import models.assessment.ExamInspection
import models.base.GeneratedIdentityModel
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.facility.Organisation

import java.util.Date
import scala.compiletime.uninitialized

@Entity
@Table(name = "app_user")
class User extends GeneratedIdentityModel:
  @ManyToMany(cascade = Array(CascadeType.ALL)) var roles: java.util.List[Role] = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL))
  var permissions: java.util.List[Permission] = uninitialized

  @ManyToOne
  @JoinColumn(name = "language_id")
  var language: Language = uninitialized

  @ManyToOne
  @JoinColumn(name = "organisation_id")
  var organisation: Organisation = uninitialized

  @OneToMany(cascade = Array(CascadeType.PERSIST), mappedBy = "user")
  @JsonBackReference
  var enrolments: java.util.List[ExamEnrolment] = uninitialized

  @OneToMany(cascade = Array(CascadeType.PERSIST), mappedBy = "user")
  @JsonBackReference
  var participations: java.util.List[ExamParticipation] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "user")
  @JsonBackReference
  var inspections: java.util.List[ExamInspection] = uninitialized

  var email: String                  = uninitialized
  var eppn: String                   = uninitialized
  var userIdentifier: String         = uninitialized
  var lastName: String               = uninitialized
  var firstName: String              = uninitialized
  var employeeNumber: String         = uninitialized
  var logoutUrl: String              = uninitialized
  var userAgreementAccepted: Boolean = false
  var lastLogin: Date                = uninitialized
  @JsonIgnore var password: String   = uninitialized // for dev-purposes only

  @Transient
  @transient
  var loginRole: Role.Name = uninitialized

  def identifier: String                  = email
  def hasRole(roles: Role.Name*): Boolean = roles.contains(loginRole)
  def isAdminOrSupport: Boolean           = hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
  def hasPermission(permType: PermissionType): Boolean =
    import scala.jdk.CollectionConverters.*
    permissions.asScala.exists(_.`type` == permType)

  override def equals(o: Any): Boolean = o match
    case u: User => this.id == u.id
    case _       => false
  override def hashCode: Int = id.toInt
  override def toString: String =
    s"User [id=$id, email=$email, name=$lastName $firstName, password=$password]"
