EXAM Quickstart for developers
=====================================

1.  Create postgresql database

        $ createdb sitnet --owner=sitnet
        
    For tests
    
        $ createdb sitnet_test --owner=sitnet
        
    For protractor
        
        $ createdb sitnet_protractor --owner=sitnet

    Requires that you have postgres installed, appropriate user created, pg_hba.conf set up to accept local connections etc).  
    Note that you can configure database related parameters (and others) in the dev config file (conf/dev.conf)

2.  Install SBT, for example from Homebrew

        $ brew install sbt

3.  Start sbt console
        
        $ sbt -Dconfig.resource=dev.conf -jvm-debug 9999

    This opens up a debug port at 9999.

4.  Start the app

        [exam] $ run

5.  Navigate to http://localhost:9000
    Accept the database migrations in case you see a prompt.

## Running Protractor tests with SBT

You can run protractor tests with sbt build using following command:

    $sbt run -Dconfig.resource=protractor.conf

### Passing parameters to protractor

You can pass parameters to protactor using _protractor.args_ property.
Passing multiple protractor parameters use comma (,) to separate parameters.

    -Dprotractor.args=--capabilities.browserName=firefox,--troubleshoot

For example running specific test spec only:

    $sbt run -Dconfig.resource=protractor.conf -Dprotractor.args=--specs=protractor/e2e/teacher-exam-spec.js

## Running Protractor tests in CI

Using CI specific protractor configuration.

    $sbt run -Dconfig.resource=protractor.conf -Dprotractor.config=ciConf.js

## More information
For more information see [official installation instructions](https://confluence.csc.fi/display/EXAM/Asennusohjeet) (in Finnish only)
