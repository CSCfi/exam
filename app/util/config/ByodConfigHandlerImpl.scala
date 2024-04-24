package util.config

import org.apache.commons.codec.digest.DigestUtils
import org.cryptonode.jncryptor.AES256JNCryptor
import play.Environment
import play.api.Logging
import play.api.libs.json._
import play.mvc.{Http, Result, Results}

import java.io.ByteArrayOutputStream
import java.net.URI
import java.nio.charset.StandardCharsets
import java.util.Optional
import java.util.zip.GZIPOutputStream
import javax.inject.Inject
import javax.xml.parsers.SAXParserFactory
import scala.io.Source
import scala.jdk.OptionConverters._
import scala.xml.{Node, XML}

object ByodConfigHandlerImpl:
  private val StartUrlPlaceholder      = "*** startURL ***"
  private val QuitPwdPlaceholder       = "*** quitPwd ***"
  private val QuitLinkPlaceholder      = "*** quitLink ***"
  private val AdminPwdPlaceholder      = "*** adminPwd ***"
  private val AllowQuittingPlaceholder = "<!-- allowQuit /-->"
  private val PasswordEncryption       = "pswd"
  private val ConfigKeyHeader          = "X-SafeExamBrowser-ConfigKeyHash"
  private val IgnoredKeys              = Seq("originatorVersion")

class ByodConfigHandlerImpl @Inject() (configReader: ConfigReader, env: Environment)
    extends ByodConfigHandler
    with Logging:

  import ByodConfigHandlerImpl._
  private val crypto        = new AES256JNCryptor
  private val encryptionKey = configReader.getSettingsPasswordEncryptionKey

  /* FIXME: have Apache provide us with X-Forwarded-Proto header so we can resolve this automatically */
  private val protocol = URI.create(configReader.getHostName).toURL.getProtocol

  private def getTemplate(hash: String, quitPwdPlain: String): String =
    val path          = s"${env.rootPath.getAbsolutePath}/conf/seb.template.plist"
    val startUrl      = s"${configReader.getHostName}?exam=$hash"
    val quitLink      = configReader.getQuitExaminationLink
    val adminPwd      = DigestUtils.sha256Hex(configReader.getExaminationAdminPassword)
    val quitPwd       = DigestUtils.sha256Hex(quitPwdPlain)
    val allowQuitting = if quitPwdPlain.isEmpty then "<false/>" else "<true/>"
    val source        = Source.fromFile(path)
    val template = source.mkString
      .replace(StartUrlPlaceholder, startUrl)
      .replace(QuitLinkPlaceholder, quitLink)
      .replace(AdminPwdPlaceholder, adminPwd)
      .replace(QuitPwdPlaceholder, quitPwd)
      .replace(AllowQuittingPlaceholder, allowQuitting)
    source.close
    template

  private def compress(data: Array[Byte]): Array[Byte] =
    val os   = new ByteArrayOutputStream
    val gzip = new GZIPOutputStream(os)
    gzip.write(data)
    gzip.flush()
    gzip.close()
    os.toByteArray

  private def compressWithHeader(data: Array[Byte]): Array[Byte] =
    val header = PasswordEncryption.getBytes(StandardCharsets.UTF_8)
    val os     = new ByteArrayOutputStream()
    os.write(header)
    os.write(data)
    os.close()
    compress(os.toByteArray)

  private def nodeToJson(node: Node): Option[JsValue] = node.label match
    case "string" | "data" =>
      val text = if node.child.nonEmpty then node.child.head.text else ""
      Some(JsString(text.trim.filterNot(_ == '\n')))
    case "true"             => Some(JsBoolean(true))
    case "false"            => Some(JsBoolean(false))
    case "integer" | "real" => Some(JsNumber(node.child.head.text.toInt))
    case "array"            => Some(JsArray(node.child.flatMap(nodeToJson)))
    case "dict"             => dictToJson(node)
    case _                  => throw new NoSuchElementException

  private def dictToJson(dict: Node): Option[JsValue] = dict.child match
    case Seq() => None
    case children =>
      val json: Seq[(String, JsValue)] = children
        .grouped(2)
        .map(c => (c.head.text, c.last))
        .filterNot(c => IgnoredKeys.contains(c._1))
        .map(n => (n._1, nodeToJson(n._2)))
        .filterNot(_._2.isEmpty)
        .map(n => n._1 -> n._2.get)
        .toSeq
        .sortBy(_._1.toLowerCase)
      Some(JsObject(json))

  override def getExamConfig(hash: String, pwd: Array[Byte], salt: String, quitPwd: String): Array[Byte] =
    val template   = getTemplate(hash, quitPwd)
    val templateGz = compress(template.getBytes(StandardCharsets.UTF_8))
    // Decrypt user defined setting password
    val plaintextPwd = getPlaintextPassword(pwd, salt)
    // Encrypt the config file using unencrypted password
    val cipherText = crypto.encryptData(templateGz, plaintextPwd.toCharArray)
    compressWithHeader(cipherText)

  override def getPlaintextPassword(pwd: Array[Byte], salt: String): String =
    val saltedPwd = crypto.decryptData(pwd, encryptionKey.toCharArray)
    new String(saltedPwd, StandardCharsets.UTF_8).replace(salt, "")

  override def getEncryptedPassword(pwd: String, salt: String): Array[Byte] =
    crypto.encryptData((pwd + salt).getBytes(StandardCharsets.UTF_8), encryptionKey.toCharArray)

  override def checkUserAgent(request: Http.RequestHeader, configKey: String): Optional[Result] =
    request.header(ConfigKeyHeader).toScala match {
      case None => Some(Results.unauthorized("SEB headers missing")).toJava
      case Some(digest) =>
        val absoluteUrl = s"$protocol://${request.host}${request.uri}"
        DigestUtils.sha256Hex(absoluteUrl + configKey) match
          case sha if sha == digest => None.toJava
          case sha =>
            logger.warn(
              s"Config key mismatch for URL $absoluteUrl and exam config key $configKey. Digest received: $sha"
            )
            Some(Results.unauthorized("Wrong configuration key digest")).toJava
    }

  override def calculateConfigKey(hash: String, quitPwd: String): String =
    // Override the DTD setting. We need it with PLIST format and in order to integrate with SBT
    val parser = XML.withSAXParser {
      val factory = SAXParserFactory.newInstance()
      factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", false)
      factory.newSAXParser()
    }
    val plist: Node = parser.loadString(getTemplate(hash, quitPwd))
    // Construct a Json-like structure out of .plist and create a digest over it
    // See SEB documentation for details
    dictToJson((plist \ "dict").head) match
      case Some(json) => DigestUtils.sha256Hex(json.toString.replaceAll("\\\\\\\\", "\\\\"))
      case None       => throw new NoSuchElementException
