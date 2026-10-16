// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.json

import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility
import com.fasterxml.jackson.annotation.{JsonIgnoreType, PropertyAccessor}
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.databind.introspect.{AnnotatedMember, JacksonAnnotationIntrospector}
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import io.ebean.bean.EntityBeanIntercept
import org.slf4j.Logger
import play.api.Logger as PlayLogger

@JsonIgnoreType private abstract class EbeanMapperIgnoreMixin

/** Suppresses Ebean bytecode-injected synthetic fields (e.g. `_$dbName`) that would cause CouchDB
  * to reject documents, since CouchDB reserves all `_`-prefixed field names.
  */
private class EbeanInternalFieldIntrospector extends JacksonAnnotationIntrospector:
  override def hasIgnoreMarker(m: AnnotatedMember): Boolean =
    m.getName.startsWith("_$") || super.hasIgnoreMarker(m)

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
  *     Logback internals,
  *   - registers a custom introspector to suppress Ebean synthetic fields (`_$dbName`, etc.) that
  *     CouchDB would reject.
  */
object EbeanMapper:
  def create(): ObjectMapper =
    val om = new ObjectMapper()
    om.registerModule(new JavaTimeModule())
    om.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
    om.setVisibility(PropertyAccessor.FIELD, Visibility.ANY)
    om.setAnnotationIntrospector(new EbeanInternalFieldIntrospector())
    om.addMixIn(classOf[EntityBeanIntercept], classOf[EbeanMapperIgnoreMixin])
    om.addMixIn(classOf[Logger], classOf[EbeanMapperIgnoreMixin])
    om.addMixIn(classOf[PlayLogger], classOf[EbeanMapperIgnoreMixin])
    om
