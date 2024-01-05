package util.config

import java.util.Optional

import play.mvc.{Http, Result}

trait ByodConfigHandler:
  def getExamConfig(hash: String, pwd: Array[Byte], salt: String, quitPwd: String): Array[Byte]
  def calculateConfigKey(hash: String, quitPwd: String): String
  def getPlaintextPassword(pwd: Array[Byte], salt: String): String
  def getEncryptedPassword(pwd: String, salt: String): Array[Byte]
  def checkUserAgent(request: Http.RequestHeader, examConfigKey: String): Optional[Result]
