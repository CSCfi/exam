// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import io.ebean.{DB, Database}
import database.EbeanQueryExtensions
import models.user.User

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class UserRepository @Inject() (databaseExecutionContext: DatabaseExecutionContext)
    extends EbeanQueryExtensions:

  private val db: Database                  = DB.getDefault
  private implicit val ec: ExecutionContext = databaseExecutionContext

  def getLoggedInUser(id: Long): Future[Option[User]] =
    Future(db.find(classOf[User]).where().idEq(id).find)
