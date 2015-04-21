package util.scala

import play.api.mvc.{Controller, Result}
import play.db.ebean.Model
import play.libs.{Json => JavaJson}

import scala.language.implicitConversions


trait ScalaHacks {self: Controller =>

  def wrapAsJson(res: Result) =
    res.withHeaders(CONTENT_TYPE -> "application/json")

  def java2Response[T <: Model](models: java.util.List[T]) =
    wrapAsJson(Ok(JavaJson.toJson(models).toString))

  def java2Response[T <: Model](model: T) =
    wrapAsJson(Ok(JavaJson.toJson(model).toString))

}
