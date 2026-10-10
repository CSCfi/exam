// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import com.opencsv.CSVWriter

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}
import scala.util.Using

/** Writes the items of a retention run to a CSV file, so that admins can review in a spreadsheet
  * what a dry run would remove, or what a real run did.
  */
object RetentionReportFile:
  val Header: Array[String] = Array(
    "run_at",
    "mode",
    "pass",
    "item",
    "item_id",
    "user_id",
    "exam",
    "course",
    "counts_from",
    "due_at",
    "outcome",
    "detail"
  )

  def fileName(report: RetentionReport): String =
    val stamp = report.ranAt.toString("yyyy-MM-dd'T'HH-mm-ss")
    s"retention-$stamp${if report.dryRun then "-dry-run" else ""}.csv"

  /** Writes the report into `dir`, creating it if needed, and returns the file. */
  def write(dir: Path, report: RetentionReport): Path =
    Files.createDirectories(dir)
    val file = dir.resolve(fileName(report))
    val mode = if report.dryRun then "dry run" else "deleting"
    Using.resource(new CSVWriter(Files.newBufferedWriter(file, StandardCharsets.UTF_8))) { csv =>
      csv.writeNext(Header)
      report.items.foreach { row =>
        val item = row.item
        csv.writeNext(
          Array(
            report.ranAt.toString,
            mode,
            row.pass.label,
            item.kind,
            item.id,
            item.userId.fold("")(_.toString),
            item.exam.getOrElse(""),
            item.course.getOrElse(""),
            item.countsFrom.fold("")(_.toString),
            item.dueAt.fold("")(_.toString),
            row.outcome,
            item.detail
          )
        )
      }
    }
    file
