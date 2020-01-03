package backend.util.config

import java.io.ByteArrayOutputStream
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.Optional
import java.util.zip.GZIPOutputStream

import backend.util.file.FileHandler
import javax.inject.Inject
import org.apache.commons.codec.digest.DigestUtils
import org.cryptonode.jncryptor.AES256JNCryptor
import play.Environment
import play.api.Logger
import play.api.libs.json._
import play.mvc.{Http, Result, Results}

import scala.compat.java8.OptionConverters._
import scala.xml.{Node, XML}

class ByodConfigHandlerImpl @Inject()(fileHandler: FileHandler,
                                      configReader: ConfigReader,
                                      env: Environment)
    extends ByodConfigHandler {

  private val logger                = Logger(this.getClass).logger
  private val START_URL_PLACEHOLDER = "*** startURL ***"
  private val QUIT_PWD_PLACEHOLDER  = "*** quitPwd ***"
  private val PASSWORD_ENCRYPTION   = "pswd"

  /* FIXME: have Apache provide us with X-Forwarded-Proto header so we can resolve this automatically */
  private def getProtocol = new URL(configReader.getHostName).getProtocol

  private def getTemplate(hash: String): Node = {
    val path     = String.format("%s/conf/seb.template.plist", env.rootPath.getAbsolutePath)
    val startUrl = String.format("%s?exam=%s", configReader.getHostName, hash)
    val template = fileHandler.read(path).replace(START_URL_PLACEHOLDER, startUrl)
    val quitPwd  = DigestUtils.sha256Hex(configReader.getQuitPassword)
    XML.loadString(template.replace(QUIT_PWD_PLACEHOLDER, quitPwd))
  }

  private def compress(data: Array[Byte]) = {
    val baos = new ByteArrayOutputStream
    try {
      val gzip = new GZIPOutputStream(baos)
      gzip.write(data)
      gzip.flush()
      baos.toByteArray
    } finally baos.close()
  }

  private def nodeToJson(node: Node): Option[JsValue] = node.label match {
    case "true"    => Some(JsBoolean(true))
    case "false"   => Some(JsBoolean(false))
    case "integer" => Some(JsNumber(node.child.head.text.toInt))
    case "array"   => Some(JsArray(node.child.flatMap(nodeToJson)))
    case "dict"    => dictToJson(node)
    case l if l == "string" || l == "data" =>
      val text = if (node.child.nonEmpty) node.child.head.text else ""
      Some(JsString(text.trim.filterNot(_ == '\n')))
    case _ => throw new NoSuchElementException
  }

  private def dictToJson(dict: Node): Option[JsValue] = dict.child match {
    case Seq() => None
    case children =>
      val json: Seq[(String, JsValue)] = children
        .grouped(2)
        .map(c => (c.head.text, c.last))
        .filterNot(_._1 == "originatorVersion")
        .map(n => (n._1, nodeToJson(n._2)))
        .filterNot(_._2.isEmpty)
        .map(n => n._1 -> n._2.get)
        .toSeq
        .sortWith((a, b) => a._1.toLowerCase < b._1.toLowerCase)
      Some(JsObject(json))
  }

  override def getExamConfig(hash: String, pwd: Array[Byte], salt: String): Array[Byte] = {
    val template   = getTemplate(hash)
    val templateGz = compress(template.toString.getBytes(StandardCharsets.UTF_8))
    val crypto     = new AES256JNCryptor
    // Decrypt user defined setting password
    val key          = configReader.getSettingsPasswordEncryptionKey
    val saltedPwd    = crypto.decryptData(pwd, key.toCharArray)
    val plainTextPwd = new String(saltedPwd, StandardCharsets.UTF_8).replace(salt, "")
    // Encrypt the config file using unencrypted password
    val cipherText   = crypto.encryptData(templateGz, plainTextPwd.toCharArray)
    val header       = PASSWORD_ENCRYPTION.getBytes(StandardCharsets.UTF_8)
    val outputStream = new ByteArrayOutputStream()
    try {
      outputStream.write(header)
      outputStream.write(cipherText)
    } finally outputStream.close()
    compress(outputStream.toByteArray)
  }

  override def getPlaintextPassword(pwd: Array[Byte], salt: String): String = {
    val crypto    = new AES256JNCryptor
    val key       = configReader.getSettingsPasswordEncryptionKey
    val saltedPwd = crypto.decryptData(pwd, key.toCharArray)
    new String(saltedPwd, StandardCharsets.UTF_8).replace(salt, "")
  }

  override def getEncryptedPassword(pwd: String, salt: String): Array[Byte] = {
    val crypto = new AES256JNCryptor
    val key    = configReader.getSettingsPasswordEncryptionKey
    crypto.encryptData((pwd + salt).getBytes(StandardCharsets.UTF_8), key.toCharArray)
  }

  override def checkUserAgent(request: Http.RequestHeader,
                              examConfigKey: String): Optional[Result] = {
    val absoluteUrl = String.format("%s://%s%s", getProtocol, request.host, request.uri)
    val header      = request.header("X-SafeExamBrowser-ConfigKeyHash").asScala
    header match {
      case None => Some(Results.unauthorized("SEB headers missing")).asJava
      case Some(digest) =>
        DigestUtils.sha256Hex(absoluteUrl + examConfigKey) match {
          case eck if eck == digest => None.asJava
          case eck =>
            logger.warn(
              "Config key mismatch for URL {} and exam config key {}. Digest received: {}",
              absoluteUrl,
              examConfigKey,
              eck)
            Some(Results.unauthorized("Wrong configuration key digest")).asJava
        }
    }
  }

  override def calculateConfigKey(hash: String): String = {
    val plist: Node = getTemplate(hash)
    // Construct a Json-like structure out of the plist for encryption, see SEB documentation for details
    dictToJson((plist \ "dict").head) match {
      case Some(json) =>
        val unescaped = json.toString.replaceAll("\\\\\\\\", "\\\\")
        DigestUtils.sha256Hex(unescaped)
      case None => throw new NoSuchElementException
    }
  }
}
