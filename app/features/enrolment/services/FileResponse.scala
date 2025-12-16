// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

/** Response data for file downloads */
case class FileResponse(
    content: String, // Base64-encoded content
    contentType: String,
    fileName: String
)
