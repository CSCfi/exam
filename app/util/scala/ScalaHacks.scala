package util.scala

import play.api.mvc.{Controller, Result}
import play.db.ebean.Model
import play.libs.{Json => JavaJson}

import scala.language.implicitConversions


trait ScalaHacks {self: Controller =>

  implicit def coursesList2Response[T <: Model](c: java.util.List[T]): Result = java2Response(c)
  implicit def course2Response[T <: Model](c: T): Result = java2Response(c)

  def wrapAsJson(res: Result) =
    res.withHeaders(CONTENT_TYPE -> "application/json")

  def java2Response[T <: Model](models: java.util.List[T]) =
    wrapAsJson(Ok(JavaJson.toJson(models).toString))

  def java2Response[T <: Model](model: T) =
    wrapAsJson(Ok(JavaJson.toJson(model).toString))

}
