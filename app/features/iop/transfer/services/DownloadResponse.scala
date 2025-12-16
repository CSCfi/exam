// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import org.apache.pekko.stream.scaladsl.Source
import org.apache.pekko.util.ByteString

/** Response data for file downloads */
enum DownloadResponse:
  case NotFound
  case InternalServerError
  case Error(status: Int)
  case Success(stream: Source[ByteString, ?], contentType: String, headers: Map[String, String])
