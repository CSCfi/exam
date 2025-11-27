// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package base

import org.joda.time.{DateTime, DateTimeZone}
import org.yaml.snakeyaml.LoaderOptions
import org.yaml.snakeyaml.constructor.{Construct, Constructor}
import org.yaml.snakeyaml.nodes.{Node, NodeId, ScalarNode, Tag}

import java.util.Date

class JodaPropertyConstructor(options: LoaderOptions) extends Constructor(options):

  // Override all scalar construction like the original Java code
  yamlClassConstructors.put(NodeId.scalar, new TimeStampConstruct())

  class TimeStampConstruct extends Construct:
    override def construct(nnode: Node): AnyRef =
      if nnode.getTag == Tag.TIMESTAMP then
        val dateConstructor = yamlConstructors.get(Tag.TIMESTAMP)
        if nnode.getType != null && classOf[DateTime].isAssignableFrom(nnode.getType) then
          val date = dateConstructor.construct(nnode).asInstanceOf[Date]
          new DateTime(date, DateTimeZone.UTC)
        else dateConstructor.construct(nnode)
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
