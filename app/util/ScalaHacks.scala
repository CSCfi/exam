package util

import play.libs.{Json => JavaJson}
import play.db.ebean.Model
import play.api.mvc.{SimpleResult, Controller}

trait ScalaHacks {self: Controller =>

  def wrapAsJson(res: SimpleResult) = {
    res.withHeaders(CONTENT_TYPE -> "application/json")
  }

  def java2Response[T <: Model](models: java.util.List[T]) =
    wrapAsJson(Ok(JavaJson.toJson(models).toString))

  def java2Response[T <: Model](model: T) =
    wrapAsJson(Ok(JavaJson.toJson(model).toString))

}