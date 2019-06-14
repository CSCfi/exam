[![Build Status](https://travis-ci.org/CSCfi/exam.svg?branch=master)](https://travis-ci.org/CSCfi/exam)

EXAM Quickstart for developers
=====================================

1.  Prerequisites: install sbt, node (^ 8) and postgresql (^ 9.4)

2.  Create postgresql database

        $ createuser -SPRD sitnet
        $ createdb sitnet --owner=sitnet
        
    For tests
    
        $ createdb sitnet_test --owner=sitnet
        
    For protractor
        
        $ createdb sitnet_protractor --owner=sitnet

    Requires that you have pg_hba.conf set up to accept local connections etc.  
    Note that you can configure database related parameters (and others) in the dev config file (conf/dev.conf)

3.  Get frontend dependencies

        $ cd app/frontend
        $ npm install       

4.  Start sbt console
        
        $ cd ../..
        $ sbt -Dconfig.resource=dev.conf -jvm-debug 9999

    This opens up a debug port at 9999 and starts up webpack dev server at 8080. You can run webpack server independent of
    sbt by passing the following build parameter
    
        $ sbt -Dconfig.resource=dev.conf -DwithoutWebpackServer=true
        
    In which case you can manage the server yourself in a separate terminal like this
    
        $ cd app/frontend
        $ npm start    

5.  Inside sbt console start the app

        [exam] $ run

6.  Open http://localhost:9000 in your browser
    Accept the database migrations in case you see a prompt.

## Skipping Karma and Protractor tests

You can skip running UI tests by passing the following build parameter

    $ sbt -Dconfig.resource=dev.conf -DskipUiTests=true
    
in which case the tests will not be executed after starting the app.     

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
For more information see [official installation instructions](https://wiki.eduuni.fi/display/CSCEXAM/Asennusohjeet) (in Finnish only)
