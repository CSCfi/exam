let HtmlScreenshotReporter = require('protractor-jasmine2-screenshot-reporter');
let Fixture = require('./fixtures/Fixture');

// Take screenshot for every failed test case.
let reporter = new HtmlScreenshotReporter({
    dest: 'target/screenshots',
    filename: 'protractor-report.html',
    captureOnlyFailedSpecs: true
});
let baseUrl = 'http://localhost:9000';
let fixture = new Fixture();

module.exports = {
    baseUrl: baseUrl,
    SELENIUM_PROMISE_MANAGER: false,
    specs: ['e2e/**/*-spec.js'],
    framework: 'jasmine2',
    allScriptsTimeout: 50000,
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
        browser.driver.manage().window().setSize(1400, 1000);

        // Disable animations so e2e tests run more quickly
        console.log("Node version " + process.version);
        let disableNgAnimate = function () {
            // eslint-disable-next-line
            angular.module('disableNgAnimate', []).run(['$animate', function ($animate) {
                $animate.enabled(false);
            }]);
        };

        browser.addMockModule('disableNgAnimate', disableNgAnimate);

        // Add screenshot reporter for failure cases
        jasmine.getEnv().addReporter(reporter);
        // Make initial request to trigger evolutions.
        return browser.get(baseUrl, 50000);
    },
    afterLaunch: function (exitCode) {
        return new Promise(function (resolve) {
            console.log("Cleaning up...");
            fixture.destroy().then(function () {
                reporter.afterLaunch(resolve.bind(this, exitCode));
            });
        });
    }
};
