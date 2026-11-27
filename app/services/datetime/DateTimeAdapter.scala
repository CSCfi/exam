// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.databind.{JsonSerializer, SerializerProvider}
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat

class DateTimeAdapter extends JsonSerializer[DateTime] {
  override def serialize(
      value: DateTime,
      gen: JsonGenerator,
      serializers: SerializerProvider
  ): Unit = {
    gen.writeString(ISODateTimeFormat.dateTime.print(value))
  }
}
