<!--
SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium

SPDX-License-Identifier: EUPL-1.2
-->

[![Build](https://github.com/CSCfi/exam/actions/workflows/build.yml/badge.svg?branch=cke5)](https://github.com/CSCfi/exam/actions) 

EXAM Quickstart for developers
=====================================

1.  Prerequisites: install SBT, Java (25), Node (>= 18) and PostgreSQL (>= 9.4).

2.  Create PostgreSQL database

    **Option A: Using Docker (recommended for development):**

        $ docker compose up -d postgres 

    Or with the provided Makefile:

        $ make db-start

    See [DOCKER.md](DOCKER.md) for detailed Docker setup instructions.

    **Option B: Using local PostgreSQL installation:**

        $ createuser -SPRD exam
        $ createdb exam --owner=exam

    For tests

        $ createdb exam_test --owner=exam

    Requires that you have pg_hba.conf set up to accept local connections etc.  
    Note that you can configure database related parameters (and others) in the dev config file (/conf/dev.conf)

3.  Get frontend dependencies and start frontend application in development mode

        $ npm ci
        $ npm start

4.  In another tab or window start sbt console and run backend application in development mode

        $ sbt -Dconfig.file=conf/dev.conf -jvm-debug 9999 -mem 2048
        [exam] $ run

    This opens up a debug port at 9999 and allocates 2 Gb of heap memory for the JVM.

5.  Open http://localhost:4200 in your browser. 
    Accept the database migrations in case you see a prompt.

6. Instead of steps 3 to 5 you can also use docker (composition) if you prefer. See [DOCKER.md](DOCKER.md).    

## More information
For more information see [official installation instructions](https://wiki.eduuni.fi/display/CSCEXAM/Asennusohjeet) (in Finnish only)

