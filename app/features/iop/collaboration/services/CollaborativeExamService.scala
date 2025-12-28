// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.iop.CollaborativeExam
import org.joda.time.DateTime
import security.BlockingIOExecutionContext

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

/** Service for CollaborativeExam database operations
  *
  * Handles all database access for CollaborativeExam entities, ensuring operations run on the
  * blocking I/O execution context.
  */
class CollaborativeExamService @Inject() (
    private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions:

  /** Find a CollaborativeExam by its ID
    *
    * @param id
    *   the exam ID
    * @return
    *   Future containing Some(CollaborativeExam) if found, None otherwise
    */
  def findById(id: Long): Future[Option[CollaborativeExam]] =
    Future(DB.find(classOf[CollaborativeExam]).where().idEq(id).find)(using ec)

  /** Find a CollaborativeExam by its external reference
    *
    * @param externalRef
    *   the external reference string
    * @return
    *   Future containing Some(CollaborativeExam) if found, None otherwise
    */
  def findByExternalRef(externalRef: String): Future[Option[CollaborativeExam]] =
    Future(DB.find(classOf[CollaborativeExam]).where().eq("externalRef", externalRef).find)(using
    ec)

  /** Find all CollaborativeExams and return them as a map keyed by external reference
    *
    * @return
    *   Future containing a Map from external reference to CollaborativeExam
    */
  def findAllByExternalRef(): Future[Map[String, CollaborativeExam]] =
    Future(
      DB.find(classOf[CollaborativeExam])
        .findList()
        .asScala
        .map(ce => ce.getExternalRef -> ce)
        .toMap
    )(using ec)

  /** Create and save a new CollaborativeExam
    *
    * @param externalRef
    *   the external reference
    * @param revision
    *   the revision string
    * @param anonymous
    *   whether the exam is anonymous
    * @return
    *   Future containing the saved CollaborativeExam
    */
  def create(
      externalRef: String,
      revision: String,
      anonymous: Boolean = true
  ): Future[CollaborativeExam] =
    Future {
      val ce = new CollaborativeExam()
      ce.setExternalRef(externalRef)
      ce.setRevision(revision)
      ce.setCreated(DateTime.now())
      ce.setAnonymous(anonymous)
      ce.save()
      ce
    }(using ec)

  /** Save an existing CollaborativeExam
    *
    * @param ce
    *   the CollaborativeExam to save
    * @return
    *   Future containing the saved CollaborativeExam
    */
  def save(ce: CollaborativeExam): Future[CollaborativeExam] =
    Future {
      ce.save()
      ce
    }(using ec)

  /** Delete a CollaborativeExam
    *
    * @param ce
    *   the CollaborativeExam to delete
    * @return
    *   Future that completes when the deletion is done
    */
  def delete(ce: CollaborativeExam): Future[Unit] =
    Future {
      ce.delete()
    }(using ec).map(_ => ())(using ec)

  /** Update local references from a JSON array
    *
    * Creates new CollaborativeExam entries for external references that don't exist locally.
    *
    * @param externalRefs
    *   a sequence of tuples containing (externalRef, revision, anonymous)
    * @param existing
    *   a map of existing CollaborativeExams by external reference
    * @return
    *   Future containing the updated map with new entries added
    */
  def updateLocalReferences(
      externalRefs: Seq[(String, String, Boolean)],
      existing: Map[String, CollaborativeExam]
  ): Future[Map[String, CollaborativeExam]] =
    Future {
      val newEntries = externalRefs
        .filterNot { case (ref, _, _) => existing.contains(ref) }
        .map { case (ref, rev, anonymous) =>
          val ce = new CollaborativeExam()
          ce.setExternalRef(ref)
          ce.setRevision(rev)
          ce.setCreated(DateTime.now())
          ce.setAnonymous(anonymous)
          ce.save()
          ref -> ce
        }
        .toMap

      existing ++ newEntries
    }(using ec)
