// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import io.ebean.text.PathProperties

import scala.quoted.*

/** Ebean property paths checked against the entity model at compile time.
  *
  * Ebean takes paths as plain strings. An unknown path in a where/orderBy expression is copied into
  * the SQL as is (PostgreSQL then fails with e.g. "cross-database references are not implemented"),
  * and an unknown name in PathProperties is silently left out of the JSON. These macros walk the
  * path through the entity fields instead, so a typo or a renamed field is a compile error:
  * {{{
  *   DB.find(classOf[ExamSection]).where()
  *     .in(path[ExamSection]("sectionQuestions.question.tags.id"), ids.asJava)
  *   val pp = props[Question]("(*, questionOwners(id, firstName), tags(name))")
  * }}}
  * Both expand to the literal itself, so they work with any Ebean method that takes a path.
  *
  * sbt does not see the fields a macro inspects (Scala 3 records no dependencies from inline
  * expansions), so an incremental compile can miss a caller whose path a model change broke. A
  * clean build (CI, or `sbt clean compile` after renaming or removing an entity field) runs every
  * macro again and catches it.
  */
object EbeanPaths:

  /** A where/orderBy/fetch path on `T`. Transient fields are rejected since they have no column. */
  inline def path[T](inline p: String): String = ${ EbeanPathMacros.path[T]('p) }

  /** PathProperties on `T`. Transient fields are allowed, Ebean writes them to JSON. */
  inline def props[T](inline spec: String): PathProperties = ${ EbeanPathMacros.props[T]('spec) }

private[database] object EbeanPathMacros:

  def path[T: Type](p: Expr[String])(using Quotes): Expr[String] =
    val s = literal(p)
    Checker(p).path(Type.of[T], s)
    Expr(s)

  def props[T: Type](spec: Expr[String])(using Quotes): Expr[PathProperties] =
    val s = literal(spec)
    Checker(spec).props(Type.of[T], s)
    '{ PathProperties.parse(${ Expr(s) }) }

  private def literal(e: Expr[String])(using Quotes): String = e match
    case Expr(s)                                                   => s
    case '{ scala.Predef.augmentString(${ Expr(s) }).stripMargin } => s.stripMargin
    case _ =>
      quotes.reflect.report.errorAndAbort(
        "Ebean paths must be string literals so that they can be checked at compile time",
        e
      )

  private class Checker(at: Expr[?])(using val q: Quotes):
    import q.reflect.*

    private val transient  = TypeRepr.of[jakarta.persistence.Transient].typeSymbol
    private val collection = TypeRepr.of[java.util.Collection[?]].typeSymbol
    private val modelAnnotations = List(
      TypeRepr.of[jakarta.persistence.Entity].typeSymbol,
      TypeRepr.of[jakarta.persistence.MappedSuperclass].typeSymbol,
      TypeRepr.of[jakarta.persistence.Embeddable].typeSymbol
    )

    private def fail(msg: String): Nothing = report.errorAndAbort(msg, at)

    private def isModel(t: TypeRepr): Boolean =
      modelAnnotations.exists(t.typeSymbol.hasAnnotation)

    /** Element type for collection properties, the property type otherwise. */
    private def target(owner: TypeRepr, field: Symbol): TypeRepr =
      val t = owner.memberType(field).widen.dealias
      if t <:< TypeRepr.of[java.util.Collection[?]] then t.baseType(collection).typeArgs.head
      else t

    private def fields(t: TypeRepr, allowTransient: Boolean): List[Symbol] =
      t.typeSymbol.fieldMembers.filter(f =>
        !f.name.contains('$') && (allowTransient || !f.hasAnnotation(transient))
      )

    private def field(t: TypeRepr, name: String, prefix: String, allowTransient: Boolean): Symbol =
      val owner = t.typeSymbol.name
      if !isModel(t) then
        fail(s"'$prefix' is a $owner, not an entity, so it has no property '$name'")
      val f = t.typeSymbol.fieldMember(name)
      if f.isNoSymbol || f.name.contains('$') then
        fail(s"$owner has no property '$name'${suggest(name, fields(t, allowTransient))}")
      if !allowTransient && f.hasAnnotation(transient) then
        fail(s"$owner.$name is @Transient, it has no column to query by")
      f

    def path(tpe: Type[?], p: String): Unit =
      val root = TypeRepr.of(using tpe)
      if !isModel(root) then fail(s"${root.show} is not an entity")
      val _ = p.split('.').toList.foldLeft((root, root.typeSymbol.name)) {
        case ((t, prefix), name) =>
          val f = field(t, name, prefix, allowTransient = false)
          (target(t, f), s"$prefix.$name")
      }

    /** Mirrors io.ebean.text.PathPropertiesParser for a single section: `(a, b(c, *), d)`. */
    def props(tpe: Type[?], spec: String): Unit =
      val root = TypeRepr.of(using tpe)
      if !isModel(root) then fail(s"${root.show} is not an entity")
      var i                     = 0
      def ws(): Unit            = while i < spec.length && spec(i).isWhitespace do i += 1
      def at(c: Char): Boolean  = { ws(); i < spec.length && spec(i) == c }
      def expect(c: Char): Unit = if at(c) then i += 1 else unexpected(s"'$c'")
      def unexpected(what: String): Nothing =
        val found = if i < spec.length then s"'${spec(i)}'" else "end of input"
        fail(s"Expected $what but found $found at position $i in \"$spec\"")
      def ident(): String =
        ws()
        val start = i
        while i < spec.length && (spec(i).isLetterOrDigit || spec(i) == '_') do i += 1
        spec.substring(start, i)
      def list(t: TypeRepr, prefix: String): Unit =
        var more = true
        while more do
          if at('*') then i += 1
          else
            val name = ident()
            if name.isEmpty then unexpected("a property name or '*'")
            val f = field(t, name, prefix, allowTransient = true)
            if at('(') then
              i += 1
              list(target(t, f), s"$prefix.$name")
              expect(')')
          more = at(',')
          if more then i += 1

      if at('(') then
        i += 1
        list(root, root.typeSymbol.name)
        expect(')')
      else list(root, root.typeSymbol.name)
      ws()
      if i < spec.length then unexpected("end of input")

    private def suggest(name: String, candidates: List[Symbol]): String =
      val wanted = name.toLowerCase
      candidates
        .map(c => (c.name, c.name.toLowerCase))
        .map((c, lc) => c -> distance(wanted, lc))
        .filter((c, d) =>
          d <= math.max(2, name.length / 3) || c.toLowerCase.contains(wanted) ||
            wanted.contains(c.toLowerCase)
        )
        .sortBy(_._2)
        .headOption
        .fold("")((c, _) => s" (did you mean '$c'?)")

    private def distance(a: String, b: String): Int =
      val d = Array.tabulate(a.length + 1, b.length + 1)((i, j) =>
        if i == 0 then j else if j == 0 then i else 0
      )
      for i <- 1 to a.length; j <- 1 to b.length do
        val cost = if a(i - 1) == b(j - 1) then 0 else 1
        d(i)(j) = math.min(math.min(d(i - 1)(j) + 1, d(i)(j - 1) + 1), d(i - 1)(j - 1) + cost)
      d(a.length)(b.length)
