var HtmlScreenshotReporter = require('protractor-jasmine2-screenshot-reporter');
var Fixture = require('./fixtures/Fixture');

// Take screenshot for every failed test case.
var reporter = new HtmlScreenshotReporter({
    dest: 'target/screenshots',
    filename: 'protractor-report.html',
    captureOnlyFailedSpecs: true
});

module.exports = {
    baseUrl: 'http://localhost:9000',
    seleniumServerJar: '../node_modules/protractor/node_modules/webdriver-manager/selenium/selenium-server-standalone-2.53.1.jar',
    specs: ['e2e/**/*-spec.js'],
    framework: 'jasmine2',
    allScriptsTimeout: 30000,
    jasmineNodeOpts: {
        defaultTimeoutInterval: 120000
    },
    beforeLaunch: function () {
        return new Promise(function (resolve) {
            reporter.beforeLaunch(resolve);
        });
    },
    onPrepare: function () {
        global.EC = browser.ExpectedConditions;
        browser.driver.manage().window().setSize(1200, 1000);

        // Disable animations so e2e tests run more quickly
        console.log("Node version " + process.version);
        var disableNgAnimate = function () {
            angular.module('disableNgAnimate', []).run(['$animate', function ($animate) {
                $animate.enabled(false);
            }]);
        };

        browser.addMockModule('disableNgAnimate', disableNgAnimate);

        // Add screenshot reporter for failure cases
        jasmine.getEnv().addReporter(reporter);
        new Fixture().loadFixture();
    },
    afterLaunch: function (exitCode) {
        return new Promise(function (resolve) {
            reporter.afterLaunch(resolve.bind(this, exitCode));
        });
    }
};
