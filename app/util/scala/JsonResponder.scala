package util.scala

import com.avaje.ebean.Model
import play.api.mvc.{Controller, Result}
import play.libs.{Json => JavaJson}

import scala.language.implicitConversions


trait JsonResponder {
  self: Controller =>

  implicit def coursesList2Response[T <: Model](c: java.util.List[T]): Result = java2Response(c)

  implicit def course2Response[T <: Model](c: T): Result = java2Response(c)

  def java2Response[T <: Model](models: java.util.List[T]) =
    Ok(JavaJson.toJson(models).toString)

  def java2Response[T <: Model](model: T) =
    Ok(JavaJson.toJson(model).toString)

}
