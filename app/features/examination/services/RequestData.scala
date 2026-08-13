// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

/** Request data needed for examination validation */
case class RequestData(
    remoteAddress: String,
    headers: Map[String, Seq[String]],
    uri: String,
    host: String
)
