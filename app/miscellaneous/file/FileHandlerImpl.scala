// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.file

import io.ebean.DB
import miscellaneous.config.ConfigReader
import models.attachment.{Attachment, AttachmentContainer}
import play.api.{Environment, Logging}
import play.api.libs.Files.TemporaryFile

import java.io.{File, FileInputStream}
import java.nio.charset.Charset
import java.nio.file.{FileSystems, Files, Paths, StandardCopyOption}
import java.util.{Base64, UUID}
import javax.inject.Inject
import scala.util.Using

class FileHandlerImpl @Inject() (environment: Environment, configReader: ConfigReader) extends FileHandler with Logging:

  private val KB = 1024

  override def read(file: File): Array[Byte] =
    Using(new FileInputStream(file)) { fis =>
      val buffer = new Array[Byte](KB)
      val result = Iterator
        .continually(fis.read(buffer))
        .takeWhile(_ != -1)
        .flatMap { bytesRead =>
          buffer.take(bytesRead)
        }
        .toArray
      result
    }.recover { case ex =>
      logger.error(s"Failed to read file ${file.getAbsolutePath} from disk!", ex)
      throw new RuntimeException(ex)
    }.get

  override def read(path: String): String =
    try
      val encoded = Files.readAllBytes(Paths.get(path))
      new String(encoded, Charset.defaultCharset())
    catch
      case ex: Exception =>
        logger.error(s"Failed to read file $path from disk!", ex)
        throw new RuntimeException(ex)

  override def getContentDisposition(file: File): String =
    s"""attachment; filename="${file.getName}""""

  override def encodeAndDelete(file: File): String =
    val content = Base64.getEncoder.encodeToString(read(file))
    if !file.delete() then logger.warn(s"Failed to delete temporary file ${file.getAbsolutePath}")
    content

  override def createFilePath(pathParams: String*): String =
    val basePath = getAttachmentPath
    val fullPath = pathParams.foldLeft(basePath)((path, param) => s"$path${File.separator}$param")

    val dir = new File(fullPath)
    if dir.mkdirs() then logger.info("Created attachment directory")

    val rndFileName = UUID.randomUUID().toString
    s"$fullPath${File.separator}$rndFileName"

  override def getAttachmentPath: String =
    val uploadPath = configReader.getAttachmentPath
    val path =
      if !uploadPath.startsWith(File.separator) then
        // Relative path - note: doesn't work on Windows, but hopefully we're not using it :)
        s"${environment.rootPath.getAbsolutePath}${File.separator}$uploadPath${File.separator}"
      else s"$uploadPath${File.separator}"
    path

  override def removeAttachmentFile(filePath: String): Unit =
    val path = FileSystems.getDefault.getPath(filePath)
    try if !Files.deleteIfExists(path) then logger.error(s"Could not delete $path because it does not exist.")
    catch case ex: Exception => logger.error("IO Exception occurred", ex)

  override def removePrevious(container: AttachmentContainer): Unit =
    Option(container.getAttachment).foreach { attachment =>
      val filePath = attachment.getFilePath
      container.setAttachment(null)
      container.save()
      attachment.delete()

      // Remove the file from the disk if no references to it are found
      val removeFromDisk = DB.find(classOf[Attachment]).where().eq("filePath", filePath).findList().isEmpty
      if removeFromDisk then removeAttachmentFile(attachment.getFilePath)
    }

  override def createNew(fileName: String, contentType: String, path: String): Attachment =
    val attachment = new Attachment()
    attachment.setFileName(fileName)
    attachment.setFilePath(path)
    attachment.setMimeType(contentType)
    attachment.save()
    attachment

  override def copyFile(sourceFile: TemporaryFile, destFile: File): Unit =
    Files.copy(
      sourceFile.path,
      destFile.toPath,
      StandardCopyOption.REPLACE_EXISTING,
      StandardCopyOption.COPY_ATTRIBUTES
    )

  override def copyFile(sourceFile: java.nio.file.Path, destFile: File): Unit =
    Files.copy(
      sourceFile,
      destFile.toPath,
      StandardCopyOption.REPLACE_EXISTING,
      StandardCopyOption.COPY_ATTRIBUTES
    )
