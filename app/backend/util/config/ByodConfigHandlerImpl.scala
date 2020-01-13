package backend.util.config

import java.io.ByteArrayOutputStream
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.Optional
import java.util.zip.GZIPOutputStream

import javax.inject.Inject
import org.apache.commons.codec.digest.DigestUtils
import org.cryptonode.jncryptor.AES256JNCryptor
import play.Environment
import play.api.Logger
import play.api.libs.json._
import play.mvc.{Http, Result, Results}

import scala.compat.java8.OptionConverters._
import scala.io.Source
import scala.xml.{Node, XML}

object ByodConfigHandlerImpl {
  private val StartUrlPlaceholder = "*** startURL ***"
  private val QuitPwdPlaceholder  = "*** quitPwd ***"
  private val PasswordEncryption  = "pswd"
  private val ConfigKeyHeader     = "X-SafeExamBrowser-ConfigKeyHash"
}
class ByodConfigHandlerImpl @Inject()(configReader: ConfigReader, env: Environment)
    extends ByodConfigHandler {

  import ByodConfigHandlerImpl._
  private val logger        = Logger(this.getClass).logger
  private val crypto        = new AES256JNCryptor
  private val encryptionKey = configReader.getSettingsPasswordEncryptionKey

  /* FIXME: have Apache provide us with X-Forwarded-Proto header so we can resolve this automatically */
  private val protocol = new URL(configReader.getHostName).getProtocol

  private def getTemplate(hash: String): Node = {
    val path     = s"${env.rootPath.getAbsolutePath}/conf/seb.template.plist"
    val startUrl = s"${configReader.getHostName}?exam=$hash"
    val source   = Source.fromFile(path)
    val template = source.mkString.replace(StartUrlPlaceholder, startUrl)
    source.close
    val quitPwd = DigestUtils.sha256Hex(configReader.getQuitPassword)
    XML.loadString(template.replace(QuitPwdPlaceholder, quitPwd))
  }

  private def compress(data: Array[Byte]): Array[Byte] = {
    val os = new ByteArrayOutputStream
    try {
      val gzip = new GZIPOutputStream(os)
      gzip.write(data)
      gzip.flush()
      os.toByteArray
    } finally os.close()
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
    // Decrypt user defined setting password
    val plaintextPwd = getPlaintextPassword(pwd, salt)
    // Encrypt the config file using unencrypted password
    val cipherText = crypto.encryptData(templateGz, plaintextPwd.toCharArray)
    val header     = PasswordEncryption.getBytes(StandardCharsets.UTF_8)
    val os         = new ByteArrayOutputStream()
    try {
      os.write(header)
      os.write(cipherText)
      compress(os.toByteArray)
    } finally os.close()
  }

  override def getPlaintextPassword(pwd: Array[Byte], salt: String): String = {
    val saltedPwd = crypto.decryptData(pwd, encryptionKey.toCharArray)
    new String(saltedPwd, StandardCharsets.UTF_8).replace(salt, "")
  }

  override def getEncryptedPassword(pwd: String, salt: String): Array[Byte] =
    crypto.encryptData((pwd + salt).getBytes(StandardCharsets.UTF_8), encryptionKey.toCharArray)

  override def checkUserAgent(request: Http.RequestHeader, configKey: String): Optional[Result] =
    request.header(ConfigKeyHeader).asScala match {
      case None => Some(Results.unauthorized("SEB headers missing")).asJava
      case Some(digest) =>
        val absoluteUrl = s"$protocol://${request.host}${request.uri}"
        DigestUtils.sha256Hex(absoluteUrl + configKey) match {
          case sha if sha == digest => None.asJava
          case sha =>
            logger.warn(
              "Config key mismatch for URL {} and exam config key {}. Digest received: {}",
              absoluteUrl,
              configKey,
              sha)
            Some(Results.unauthorized("Wrong configuration key digest")).asJava
        }
    }

  override def calculateConfigKey(hash: String): String = {
    val plist: Node = getTemplate(hash)
    // Construct a Json-like structure out of .plist and create a digest over it
    // See SEB documentation for details
    dictToJson((plist \ "dict").head) match {
      case Some(json) =>
        val unescaped = json.toString.replaceAll("\\\\\\\\", "\\\\")
        DigestUtils.sha256Hex(unescaped)
      case None => throw new NoSuchElementException
    }
  }
}
