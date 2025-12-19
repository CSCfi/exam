// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.config

import org.apache.commons.codec.digest.DigestUtils
import org.cryptonode.jncryptor.AES256JNCryptor
import play.Environment
import play.api.Logging
import play.api.libs.json._
import play.api.mvc.{Result, Results}

import java.io.ByteArrayOutputStream
import java.net.URI
import java.nio.charset.StandardCharsets
import java.util.zip.GZIPOutputStream
import javax.inject.Inject
import javax.xml.parsers.SAXParserFactory
import scala.io.Source
import scala.xml.{Node, XML}

object ByodConfigHandlerImpl:
  private val StartUrlPlaceholder      = "*** startURL ***"
  private val QuitPwdPlaceholder       = "*** quitPwd ***"
  private val QuitLinkPlaceholder      = "*** quitLink ***"
  private val AdminPwdPlaceholder      = "*** adminPwd ***"
  private val AllowQuittingPlaceholder = "<!-- allowQuit /-->"
  private val PasswordEncryption       = "pswd"
  private val ConfigKeyHeader          = "X-SafeExamBrowser-ConfigKeyHash" // Standard SEB header
  private val CustomConfigKeyHeader = "X-Exam-Seb-Config-Key" // Custom header from JS API
  private val CustomConfigUrlHeader = "X-Exam-Seb-Config-Url" // Custom header from JS API
  private val IgnoredKeys           = Seq("originatorVersion")

class ByodConfigHandlerImpl @Inject() (configReader: ConfigReader, env: Environment)
    extends ByodConfigHandler
    with Logging:

  import ByodConfigHandlerImpl.*
  private val crypto        = new AES256JNCryptor
  private val encryptionKey = configReader.getSettingsPasswordEncryptionKey

  /* FIXME: have Apache provide us with X-Forwarded-Proto header so we can resolve this automatically */
  private val protocol = URI.create(configReader.getHostName).toURL.getProtocol

  private def getTemplate(hash: String, quitPwdPlain: String) =
    val path          = s"${env.rootPath.getAbsolutePath}/conf/template/seb.template.plist"
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

  private def compress(data: Array[Byte]) =
    val os   = new ByteArrayOutputStream
    val gzip = new GZIPOutputStream(os)
    gzip.write(data)
    gzip.flush()
    gzip.close()
    os.toByteArray

  private def compressWithHeader(data: Array[Byte]) =
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

  private def dictToJson(dict: Node) = dict.child match
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

  override def getExamConfig(
      hash: String,
      pwd: Array[Byte],
      salt: String,
      quitPwd: String
  ): Array[Byte] =
    val template   = getTemplate(hash, quitPwd)
    val templateGz = compress(template.getBytes(StandardCharsets.UTF_8))
    // Decrypt user-defined setting password
    val plaintextPwd = getPlaintextPassword(pwd, salt)
    // Encrypt the config file using the unencrypted password
    val cipherText = crypto.encryptData(templateGz, plaintextPwd.toCharArray)
    compressWithHeader(cipherText)

  override def getPlaintextPassword(pwd: Array[Byte], salt: String): String =
    val saltedPwd = crypto.decryptData(pwd, encryptionKey.toCharArray)
    new String(saltedPwd, StandardCharsets.UTF_8).replace(salt, "")

  override def getEncryptedPassword(pwd: String, salt: String): Array[Byte] =
    crypto.encryptData((pwd + salt).getBytes(StandardCharsets.UTF_8), encryptionKey.toCharArray)

  override def checkUserAgent(
      headers: Map[String, Seq[String]],
      uri: String,
      host: String,
      configKey: String
  ): Option[Result] =
    // Check both standard SEB header (old API) and custom JS API header (new API)
    val standardHeader = headers.get(ConfigKeyHeader).flatMap(_.headOption)
    val customHeader   = headers.get(CustomConfigKeyHeader).flatMap(_.headOption)

    (standardHeader, customHeader) match
      case (None, None) =>
        logger.warn(
          s"""SEB headers MISSING from request to $uri.
             |Checked: '$ConfigKeyHeader' and '$CustomConfigKeyHeader'""".stripMargin.replaceAll(
            "\n",
            " "
          )
        )
        Some(Results.Unauthorized("SEB headers missing"))
      case (Some(digest), _) =>
        // Standard SEB header present (old API) - automatically sent by SEB with classic WebView
        logger.debug(s"Using STANDARD SEB header: $ConfigKeyHeader")
        validate(s"$protocol://$host$uri", digest, configKey)
      case (None, Some(digest)) =>
        // Custom header from JavaScript API (new API) - modern WebView
        logger.debug(s"Using CUSTOM header from JS API: $CustomConfigKeyHeader")
        headers.get(CustomConfigUrlHeader).flatMap(_.headOption) match
          case Some(url) => validate(url, digest, configKey)
          case None =>
            logger.warn(
              s"SEB validation FAILED (JavaScript API): $CustomConfigUrlHeader header is missing"
            )
            Some(Results.Unauthorized("SEB page URL header missing"))

  private def validate(url: String, digest: String, configKey: String): Option[Result] =
    DigestUtils.sha256Hex(url + configKey) match
      case expected if expected == digest => None
      case expected =>
        logger.warn(
          s"""SEB validation FAILED!
             |PageURL=$url,
             |ConfigFileHash=$configKey,
             |ExpectedDigest=$expected,
             |ReceivedKey=$digest""".stripMargin.replaceAll("\n", " ")
        )
        Some(Results.Unauthorized("Wrong configuration key digest"))

  override def calculateConfigKey(hash: String, quitPwd: String): String =
    // Override the DTD setting. We need it with PLIST format and to integrate with SBT
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
