// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package base

import io.ebean.DB
import models.exam.Exam
import org.yaml.snakeyaml.representer.Representer
import org.yaml.snakeyaml.{DumperOptions, LoaderOptions, Yaml}

import java.io.FileInputStream
import scala.jdk.CollectionConverters._
import scala.util.Using

object TestDataLoader:
  private val YAML_FILE_PATH = "test/resources/initial-data.yml"

  /** Load test data from a YAML file. */
  def load(): Unit =
    val loaderOptions = new LoaderOptions()
    loaderOptions.setMaxAliasesForCollections(400)
    loaderOptions.setTagInspector(_ => true)

    val dumperOptions = new DumperOptions()
    val yaml = new Yaml(
      new JodaPropertyConstructor(loaderOptions),
      new Representer(dumperOptions),
      dumperOptions,
      loaderOptions
    )

    val result = Using(new FileInputStream(YAML_FILE_PATH)): is =>
      val all =
        yaml
          .load(is)
          .asInstanceOf[java.util.Map[String, java.util.List[Object]]]
          .asScala
          .toMap
          .map((k, v) => (k, v.asScala.toList))

      // Load entities in dependency order
      val entityTypes = List(
        "role",
        "exam-type",
        "exam-execution-type",
        "languages",
        "organisations",
        "attachments",
        "users",
        "grade-scales",
        "grades",
        "question-essay",
        "question-multiple-choice",
        "question-weighted-multiple-choice",
        "question-claim-choice",
        "question-clozetest",
        "softwares",
        "courses",
        "comments"
      )
      val examDependentTypes = List(
        "exam-sections",
        "section-questions",
        "exam-participations",
        "exam-inspections",
        "mail-addresses",
        "calendar-events",
        "exam-rooms",
        "exam-machines",
        "exam-room-reservations",
        "exam-enrolments"
      )

      // Save all standard entities
      entityTypes.filter(all.contains) foreach (et => DB.saveAll(all(et).asJava))
      // Special handling for exams (need hash generation)
      all("exams")
        .map(_.asInstanceOf[Exam])
        .foreach(exam =>
          exam.generateHash()
          exam.save()
        )
      // Save exam dependent types the last
      examDependentTypes.filter(all.contains) foreach (et => DB.saveAll(all(et).asJava))

    result
      .recover:
        case e: Exception => throw new RuntimeException("Failed to load test data", e)
      .get
