package backend.controllers.base

/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */


import javax.inject.Inject
import play.Environment
import play.api.Logging
import play.api.mvc.{Action, AnyContent, InjectedController}
import play.twirl.api.Html

class Index @Inject()(environment: Environment)
  extends InjectedController with Logging {

  import scala.reflect.runtime.universe._

  private def getTemplateInstance(clsName: String) = {
    val mirror = runtimeMirror(getClass.getClassLoader)
    val module = mirror.staticModule(clsName)
    mirror.reflectModule(module).instance.asInstanceOf[ {def render(): Html}]
  }

  def index(): Action[AnyContent] = Action {
    if (environment.isProd) {
      try {
        Ok(getTemplateInstance("backend.views.html.index").render())
      } catch {
        case e: Exception =>
          logger.error("Production index page template not found. Have you built it with webpack?", e)
          InternalServerError
      }
    } else {
      Ok(backend.views.html.devindex.render())
    }
  }

}

