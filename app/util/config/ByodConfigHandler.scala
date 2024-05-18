// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util.config

import play.mvc.{Http, Result}

import java.util.Optional

trait ByodConfigHandler:
  def getExamConfig(hash: String, pwd: Array[Byte], salt: String, quitPwd: String): Array[Byte]
  def calculateConfigKey(hash: String, quitPwd: String): String
  def getPlaintextPassword(pwd: Array[Byte], salt: String): String
  def getEncryptedPassword(pwd: String, salt: String): Array[Byte]
  def checkUserAgent(request: Http.RequestHeader, examConfigKey: String): Optional[Result]
