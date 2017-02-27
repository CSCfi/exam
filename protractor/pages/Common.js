var LoginPage = require('./LoginPage');
var Fixture = require('../fixtures/Fixture');
var Logs = require('protractor-browser-logs');

var Common = function () {
    var loginPage = new LoginPage();
    var fixture = new Fixture();
    var logs = Logs(browser);

    this.beforeAll = function (username, password, role) {
        fixture.clearFixtures().then(function () {
            fixture.loadFixtures(['users.json']);
        });
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
        fixture.destroy();
    };

    this.beforeEach = function () {
        fixture.clearFixtures().then(function () {
            fixture.loadFixtures();
        });

        logs.ignore(function (entry) {
            console.log("LOG: " + entry.message);
            return entry.message.indexOf('401 (Unauthorized)') !== -1;
        });
        loginPage.load();
    };

    this.afterEach = function () {
        logs.verify();
    };

    this.waitToasters = function () {
        browser.wait(EC.visibilityOf(element(by.css('.toast'))), 20000)
            .then(function () {
                console.log("Toasters visible!");
                console.log("Click all toasters");
                element.all(by.css('.toast')).each(function (toast) {
                    toast.isPresent().then(function (present) {
                        if (!present) {
                            console.log("Toaster is not present anymore.");
                            return;
                        }
                        toast.getInnerHtml().then(function (text) {
                            console.log("Click " + text);
                        });
                        toast.click();
                    })
                }).then(function () {
                    console.log("All clicked! waiting toasters to be gone...");
                    browser.wait(function () {
                        return element.all(by.css('.toast')).count()
                            .then(function (count) {
                                return count === 0;
                            });
                    }, 10000);
                });
            });
    };
};
module.exports = Common;