# Instructions to run simulations

Test configurations can be found in file `src/test/resources/application.conf`. 

# 1. Backup database
- Requirements are:
    - It must contain one active exam (that is an exam you can enroll to) with the name specified in test configuration under `gatling.examName`.
    - Add N users and exam machines, N being the amount of users you would like to run the simulation with
      - Users and machines can be added with the scripts in `/scripts` directory
      - You can create user and machines with: `psql -Uexam -dexam -f add_users.sql -v v1=N` and respectively `psql -Uexam -dexam -f add_exam_machines.sql -v v1=N` where N being the amount of users to simulate with
- After above requirements are met, it is advisable to take a backup of the database so you can reuse it during testing
- Between runs, it is probably simplest to reset the database and start from scratch, for example: `dropdb exam; createdb exam --owner=exam; psql -Uexam < exam-dump.sql`. You need to shut down exam server before doing this so there are no active database connections during reset.

# 2. Run tests
- You need a running Exam instance listening for connections.
- After exam is running and accepting connections you can start testing.
- First create the enrolments and reservations by running `sbt -Dusers=N "Gatling/testOnly Reservation"` N being the amount of users you are testing with (see point 1)
- Then simulate the examinations `sbt -Dusers=N "Gatling/testOnly Examination"`
- Gatling should print out a path to generated test reports.

# 3. Running on docker containers
- This is not directly related to how gatling tests are run. They should be agnostic of the backend. Only concern is that the backend services are to be accessible from the tests. By default the tests connect to localhost:9000. Moreover the backend needs to be run in dev-mode thus skipping the Shibboleth SSO in favor of plain password authentication. Dev mode is turned on in Exam's application.conf by setting `exam.login=DEBUG`
- Also, database should be directly accessible by the tests. By default they connect to postgres at port 5432 using database named exam and uname/pwd exam/exam
