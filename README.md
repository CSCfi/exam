![Build](https://github.com/CSCfi/exam/actions/workflows/scala.yml/badge.svg?branch=dev)
EXAM Quickstart for developers
=====================================

1.  Prerequisites: install SBT, Java (21), Node (>= 18) and PostgreSQL (>= 9.4).

2.  Create PostgreSQL database

        $ createuser -SPRD exam
        $ createdb exam --owner=exam

    For tests

        $ createdb exam_test --owner=exam

    Requires that you have pg_hba.conf set up to accept local connections etc.  
    Note that you can configure database related parameters (and others) in the dev config file (/conf/dev.conf)

3.  Get frontend dependencies and start frontend application in development mode

        $ cd ui
        $ npm install
        $ npm start

4.  In another tab or window start sbt console and run backend application in development mode

        $ sbt -Dconfig.file=conf/dev.conf -jvm-debug 9999 -mem 2048
        [exam] $ run

    This opens up a debug port at 9999 and allocates 2 Gb of heap memory for the JVM

5.  Open http://localhost:4200 in your browser
    Accept the database migrations in case you see a prompt.

## More information
For more information see [official installation instructions](https://wiki.eduuni.fi/display/CSCEXAM/Asennusohjeet) (in Finnish only)

