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
import services.datetime.JsonInstant
import services.json.{EbeanMapper, JsonDeserializer}

import java.time.Instant
import scala.compiletime.uninitialized

@Entity
class ExternalExam extends GeneratedIdentityModel:
  @OneToOne var creator: User                         = uninitialized
  @DbJsonB var content: java.util.Map[String, Object] = uninitialized
  @JsonInstant var created: Instant                   = uninitialized
  @JsonInstant var started: Instant                   = uninitialized
  @JsonInstant var finished: Instant                  = uninitialized
  @JsonInstant var sent: Instant                      = uninitialized

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
