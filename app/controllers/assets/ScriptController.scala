// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assets

import controllers.Assets
import play.api.mvc._

import javax.inject._

@Singleton
class ScriptController @Inject() (assets: Assets, cc: ControllerComponents) extends AbstractController(cc):

  def index: Action[AnyContent] = assets.at("index.html")

  def assetOrDefault(resource: String): Action[AnyContent] =
    // if resource.contains("assets/scripts") then assets.at("../../node_modules/mathjax/MathJax.js")
    if resource.contains(".") then assets.at(resource) else index
