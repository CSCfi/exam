package util.scala

import play.libs.{Json => JavaJson}
import play.api.mvc.{SimpleResult, Controller}
import play.db.ebean.Model
import models.Course

trait ScalaHacks {self: Controller =>

  implicit def coursesList2Response[T <: Model](c: java.util.List[T]): SimpleResult = java2Response(c)
  implicit def course2Response[T <: Model](c: T): SimpleResult = java2Response(c)

  def wrapAsJson(res: SimpleResult) =
    res.withHeaders(CONTENT_TYPE -> "application/json")

  def java2Response[T <: Model](models: java.util.List[T]) =
    wrapAsJson(Ok(JavaJson.toJson(models).toString))

  def java2Response[T <: Model](model: T) =
    wrapAsJson(Ok(JavaJson.toJson(model).toString))

}
