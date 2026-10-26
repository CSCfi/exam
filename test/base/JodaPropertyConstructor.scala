// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package base

import org.yaml.snakeyaml.LoaderOptions
import org.yaml.snakeyaml.constructor.{Construct, Constructor}
import org.yaml.snakeyaml.error.YAMLException
import org.yaml.snakeyaml.introspector.{BeanAccess, Property, PropertyUtils}
import org.yaml.snakeyaml.nodes.*

import java.lang.annotation.Annotation
import java.lang.reflect.{Field, Method, ParameterizedType}
import java.time.Instant
import java.util.Date

class JodaPropertyConstructor(options: LoaderOptions) extends Constructor(options):

  // SnakeYAML's JavaBean introspection looks for getXxx/setXxx methods, which Scala
  // var fields don't generate (they produce name()/name_$eq(v) instead). Override
  // getProperty to find the Scala-style accessors so that Ebean's bytecode enhancement
  // is properly triggered during set operations (needed for relationship tracking).
  setPropertyUtils(new PropertyUtils:
    override def getProperty(typ: Class[?], name: String, bAccess: BeanAccess): Property =
      findField(typ, name) match
        case Some(field) => new ScalaVarProperty(field)
        case None =>
          try super.getProperty(typ, name, bAccess)
          catch
            case _: Exception =>
              throw new YAMLException(s"Unable to find property '$name' on class: ${typ.getName}")

    private def findField(cls: Class[?], name: String): Option[Field] =
      if cls == null then None
      else
        cls.getDeclaredFields.find(_.getName == name)
          .orElse(findField(cls.getSuperclass, name))
  )

  // Uses Scala accessor methods (name() / name_$eq(v)) so Ebean's bytecode enhancement
  // intercepts field writes and properly tracks loaded relationships.
  private class ScalaVarProperty(field: Field) extends Property(field.getName, field.getType):
    private val getter: Option[Method] = findMethod(field.getDeclaringClass, field.getName)
    private val setter: Option[Method] = findMethod(field.getDeclaringClass, field.getName + "_$eq")
    field.setAccessible(true)

    override def get(obj: Object): Object =
      getter.map(_.invoke(obj)).getOrElse(field.get(obj))

    override def set(obj: Object, value: Object): Unit =
      setter.map(_.invoke(obj, value)).getOrElse(field.set(obj, value))

    override def getActualTypeArguments: Array[Class[?]] =
      field.getGenericType match
        case pt: ParameterizedType =>
          pt.getActualTypeArguments.collect { case c: Class[?] => c }
        case _ => Array.empty

    override def getAnnotations: java.util.List[Annotation] =
      java.util.Arrays.asList(field.getAnnotations*)

    override def getAnnotation[A <: Annotation](annotationType: Class[A]): A =
      field.getAnnotation(annotationType)

    private def findMethod(cls: Class[?], name: String): Option[Method] =
      if cls == null then None
      else
        cls.getMethods.find(_.getName == name)
          .orElse(cls.getDeclaredMethods.find(_.getName == name))
          .orElse(findMethod(cls.getSuperclass, name))

  // Override all scalar construction like the original Java code
  yamlClassConstructors.put(NodeId.scalar, new TimeStampConstruct())

  class TimeStampConstruct extends Construct:
    override def construct(nnode: Node): AnyRef =
      if nnode.getTag == Tag.TIMESTAMP then
        val dateConstructor = yamlConstructors.get(Tag.TIMESTAMP)
        val date            = dateConstructor.construct(nnode).asInstanceOf[Date]
        if nnode.getType != null && classOf[Instant].isAssignableFrom(nnode.getType) then
          date.toInstant
        else date
      else
        // For non-timestamp scalars, use the default scalar construction
        val scalarNode = nnode.asInstanceOf[ScalarNode]
        val value      = scalarNode.getValue

        // Handle common scalar types
        Option(nnode.getType) match
          case Some(t) if t == java.lang.Boolean.TYPE => java.lang.Boolean.valueOf(value)
          case Some(t) if t == java.lang.Integer.TYPE => java.lang.Integer.valueOf(value)
          case Some(t) if t.isEnum                    =>
            // Handle enum types - use reflection to call valueOf
            val valueOfMethod = t.getDeclaredMethod("valueOf", classOf[String])
            valueOfMethod.invoke(null, value)
          case None => value
          case _    =>
            // For other types, try to find a string constructor or valueOf method
            try
              // First try valueOf method (common for enums and wrapper types)
              val valueOfMethod = nnode.getType.getDeclaredMethod("valueOf", classOf[String])
              valueOfMethod.invoke(null, value)
            catch
              case _: Exception =>
                try
                  // Then try string constructor
                  val constructor = nnode.getType.getDeclaredConstructor(classOf[String])
                  constructor.newInstance(value)
                catch case _: Exception => value

    override def construct2ndStep(node: Node, obj: Object): Unit =
      // No second step construction needed for scalars
      ()
