// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.file

import models.attachment.{Attachment, AttachmentContainer}
import play.api.libs.Files.TemporaryFile

import java.io.File
import java.nio.file.Path

trait FileHandler:
  def read(file: File): Array[Byte]
  def read(path: String): String
  def encodeAndDelete(file: File): String
  def getContentDisposition(file: File): String
  @annotation.varargs
  def createFilePath(pathParams: String*): String
  def getAttachmentPath: String
  def removeAttachmentFile(filePath: String): Unit
  def removePrevious(container: AttachmentContainer): Unit
  def createNew(fileName: String, contentType: String, path: String): Attachment
  def copyFile(sourceFile: TemporaryFile, destFile: File): Unit
  def copyFile(sourceFile: Path, destFile: File): Unit
