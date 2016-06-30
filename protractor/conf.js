exports.config = {
    baseUrl: "http://localhost:9000",
    seleniumServerJar: "../node_modules/protractor/selenium/selenium-server-standalone-2.47.1.jar",
    specs: ['e2e/*.js'],
    framework: 'jasmine2',
    onPrepare: function () {
        global.EC = protractor.ExpectedConditions;
        browser.driver.manage().window().setSize(1200, 1000);

        // Disable animations so e2e tests run more quickly
        var disableNgAnimate = function() {
            angular.module('disableNgAnimate', []).run(['$animate', function($animate) {
                $animate.enabled(false);
            }]);
        };

        browser.addMockModule('disableNgAnimate', disableNgAnimate);
    }
};
