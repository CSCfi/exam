// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package base

import io.avaje.config.Config
import io.ebean.DB

import java.sql.Connection
import scala.annotation.tailrec
import scala.util.Using

/** Gives every test an empty database without rebuilding the schema for each one.
  *
  * application-test.yaml has Ebean drop and recreate the schema whenever an app boots. With an app
  * per test that took ~1.5 s per test against a local PostgreSQL, most of a typical test's run
  * time. Only the first app of the test JVM does it now; for later ones the DDL is switched off and
  * the rows are deleted and the sequences restarted instead, which takes a few tens of milliseconds
  * and leaves the database in the same state.
  */
object TestDatabase:
  private var schemaCreated = false

  /** Call once the app of a test has been built (Ebean creates its database at that point). */
  def prepare(): Unit = synchronized {
    if schemaCreated then reset()
    else
      // Avaje caches Ebean's configuration at first use, so a system property would go unseen
      Config.setProperty("ebean.ddl.run", "false")
      Config.setProperty("ebean.ddl.generate", "false")
      schemaCreated = true
  }

  private def reset(): Unit =
    Using.resource(DB.getDefault.dataSource().getConnection): conn =>
      conn.setAutoCommit(false)
      Using.resource(conn.createStatement()): stmt =>
        stmt.execute(resetScript(conn))
      conn.commit()

  // The schema stays the same for the whole JVM, so the script is built once
  private var script: Option[String] = None

  private def resetScript(conn: Connection): String =
    script.getOrElse:
      val tables = query(
        conn,
        "SELECT quote_ident(tablename) FROM pg_tables WHERE schemaname = current_schema()"
      )
        .map(_.head)
      val foreignKeys = query(
        conn,
        """SELECT c.conrelid::regclass::text, c.confrelid::regclass::text, quote_ident(a.attname)
          |FROM pg_constraint c
          |JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
          |WHERE c.contype = 'f' AND c.connamespace = current_schema()::regnamespace""".stripMargin
      ).map(row => (row(0), row(1), row(2)))
      val sequences =
        query(
          conn,
          "SELECT quote_ident(sequencename) FROM pg_sequences WHERE schemaname = current_schema()"
        )
          .map(_.head)
      // Self references (e.g. exam.parent_id) are cut first so that a table's rows can go at once
      val selfReferences = foreignKeys.collect:
        case (child, parent, column) if child == parent =>
          s"UPDATE $child SET $column = NULL WHERE $column IS NOT NULL"
      val references = foreignKeys.collect:
        case (child, parent, _) if child != parent => (child, parent)
      val sql = List("SET LOCAL synchronous_commit = off") ++ selfReferences ++
        deleteOrder(tables.toSet, references).map(t => s"DELETE FROM $t") ++
        sequences.map(s => s"ALTER SEQUENCE $s RESTART")
      val result = sql.mkString(";\n")
      script = Some(result)
      result

  // Referencing tables before the tables they reference
  private def deleteOrder(tables: Set[String], references: List[(String, String)]): List[String] =
    @tailrec
    def loop(left: Set[String], acc: List[String]): List[String] =
      if left.isEmpty then acc
      else
        val ready = left.filterNot(t => references.exists((c, p) => p == t && left.contains(c)))
        require(ready.nonEmpty, s"Foreign key cycle among ${left.mkString(", ")}")
        loop(left -- ready, acc ++ ready.toList.sorted)
    loop(tables, Nil)

  private def query(conn: Connection, sql: String): List[List[String]] =
    Using.resource(conn.createStatement()): stmt =>
      Using.resource(stmt.executeQuery(sql)): rs =>
        val columns = rs.getMetaData.getColumnCount
        Iterator
          .continually(rs.next())
          .takeWhile(identity)
          .map(_ => (1 to columns).map(rs.getString).toList)
          .toList
