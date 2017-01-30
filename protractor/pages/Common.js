var LoginPage = require('./LoginPage');
var Fixture = require('../fixtures/Fixture');
var Logs = require('protractor-browser-logs');

var Common = function () {
    var loginPage = new LoginPage();
    var fixture = new Fixture();
    var logs = Logs(browser);

    this.beforeAll = function (username, password, role) {
        loginPage.load();
        loginPage.login(username, password);
        if (role) {
            loginPage.selectRole(role);
        }
        // Wait toasters to appear and then click them to go away because they might block some elements.
        this.waitToasters();
    };

    this.afterAll = function () {
        loginPage.logout();
    };

    this.beforeEach = function () {
        logs.ignore(function (entry) {
            console.log("LOG: " + entry.message);
            return entry.message.indexOf('401 (Unauthorized)') !== -1;
        });
        loginPage.load();
    };

    this.afterEach = function () {
        fixture.loadFixture();
        return logs.verify();
    };

    this.waitToasters = function () {
        browser.wait(EC.visibilityOf(element(by.css('.toast'))), 3000)
            .then(function () {
                console.log("Toaster visible!");
                element.all(by.css('.toast')).each(function (toast) {
                    toast.click();
                });
                console.log("Wait toasters to be gone!");
                browser.wait(function () {
                    var deferred = protractor.promise.defer();
                    var toaster = element(by.css('.toast'));
                    toaster.isPresent()
                        .then(function (isPresent) {
                            deferred.fulfill(!isPresent);
                        });
                    return deferred.promise;
                }, 3000);
                console.log("All toasters are gone!");
            });
    };
};
module.exports = Common;