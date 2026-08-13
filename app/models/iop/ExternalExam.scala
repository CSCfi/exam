// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.iop

import com.fasterxml.jackson.databind.ObjectMapper
import io.ebean.annotation.DbJsonB
import io.ebean.text.json.EJson
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.exam.Exam
import models.user.User
import org.joda.time.DateTime
import services.json.{EbeanMapper, JsonDeserializer}

import scala.compiletime.uninitialized

@Entity
class ExternalExam extends GeneratedIdentityModel:
  @OneToOne var creator: User                              = uninitialized
  @DbJsonB var content: java.util.Map[String, Object]      = uninitialized
  @Temporal(TemporalType.TIMESTAMP) var created: DateTime  = uninitialized
  @Temporal(TemporalType.TIMESTAMP) var started: DateTime  = uninitialized
  @Temporal(TemporalType.TIMESTAMP) var finished: DateTime = uninitialized
  @Temporal(TemporalType.TIMESTAMP) var sent: DateTime     = uninitialized

  var externalRef: String = uninitialized // exam.hash of the remote parent exam
  var hash: String        = uninitialized // LOCAL EXAM REFERENCE

  def deserialize: Exam =
    val mapper = new ObjectMapper
    val json   = mapper.writeValueAsString(content)
    val node   = mapper.readTree(json)
    JsonDeserializer.deserialize(classOf[Exam], node)

  def serialize(examContent: Exam): Unit =
    val txt = EbeanMapper.create().writeValueAsString(examContent)
    val map = EJson.parseObject(txt)
    content = map
    update()
