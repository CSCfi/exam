package util.scala

import controllers.CourseController
import play.api.mvc.QueryStringBindable.Parsing

object Binders {

  implicit object bindableFilterType extends Parsing[CourseController.FilterType](
    _.trim match {
      case "name" => CourseController.FilterByName
      case "code" => CourseController.FilterByCode
    }, _.toString, (key: String, e: Exception) =>
      "Cannot parse parameter %s as FilterType: %s".format(key, e.getMessage)
  )

}
