// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.databind.{JsonSerializer, SerializerProvider}

import java.time.Instant
import java.time.format.DateTimeFormatter

class InstantAdapter extends JsonSerializer[Instant]:
  override def serialize(
      value: Instant,
      gen: JsonGenerator,
      serializers: SerializerProvider
  ): Unit =
    gen.writeString(DateTimeFormatter.ISO_INSTANT.format(value))
