// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.json

import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility
import com.fasterxml.jackson.annotation.{JsonIgnoreType, PropertyAccessor}
import com.fasterxml.jackson.databind.ObjectMapper
import io.ebean.bean.EntityBeanIntercept
import org.slf4j.Logger
import play.api.Logger as PlayLogger

@JsonIgnoreType private abstract class EbeanMapperIgnoreMixin

/** Creates an [[ObjectMapper]] configured to serialise Ebean-enhanced Scala entities.
  *
  * Ebean byte-code enhancement adds a public `_ebean_intercept` field to every entity. Scala
  * classes that mix in `Logging` or similar add a private `logger` field. A plain ObjectMapper
  * would either skip private `var` fields (missing data) or choke on those internal objects
  * (circular references).
  *
  * This factory:
  *   - sets FIELD visibility to ANY so that private `var` fields are included,
  *   - registers @JsonIgnoreType mixins for `EntityBeanIntercept` and `Logger` to suppress Ebean/
  *     Logback internals.
  */
object EbeanMapper:
  def create(): ObjectMapper =
    val om = new ObjectMapper()
    om.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)
    om.addMixIn(classOf[EntityBeanIntercept], classOf[EbeanMapperIgnoreMixin])
    om.addMixIn(classOf[Logger], classOf[EbeanMapperIgnoreMixin])
    om.addMixIn(classOf[PlayLogger], classOf[EbeanMapperIgnoreMixin])
    om
