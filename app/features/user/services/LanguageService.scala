// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

import io.ebean.DB
import database.EbeanQueryExtensions
import models.user.Language

import javax.inject.Inject

class LanguageService @Inject() () extends EbeanQueryExtensions:
  def listSupportedLanguages: Seq[Language] = DB.find(classOf[Language]).list
