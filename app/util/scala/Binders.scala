package util.scala

import play.api.mvc.QueryStringBindable.Parsing
import controllers.CourseController

object Binders {

  implicit object bindableFilterType extends Parsing[CourseController.FilterType](
    _.trim match {
      case "name" => CourseController.FilterByName
      case "code" => CourseController.FilterByCode
    }, _.toString, (key: String, e: Exception) =>
      "Cannot parse parameter %s as FilterType: %s".format(key, e.getMessage)
  )

}
