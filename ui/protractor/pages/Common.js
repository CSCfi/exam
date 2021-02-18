const LoginPage = require('./LoginPage');
const Fixture = require('../fixtures/Fixture');
const Logs = require('protractor-browser-logs');

class Common {

    constructor() {
        this.logs = Logs(browser);
        this.loginPage = new LoginPage();
        this.fixture = new Fixture();
    }

    async beforeEach(username, password, role) {
        await this.fixture.clearFixtures();
        await this.fixture.loadFixtures();
        this.logs.ignore(entry => {
            console.log('LOG: ' + entry.message);
            return entry.message.indexOf('401 (Unauthorized)') !== -1;
        });
        await this.loginPage.load();
        await this.loginPage.login(username, password);
        if (role) {
            await this.loginPage.selectRole(role);
        }
        // Wait toasters to appear and then click them to go away because they might block some elements.
        await this.waitToasters();
    }

    async afterAll() {
        await this.fixture.destroy();
    }

    async afterEach() {
        await this.loginPage.logout();
        await this.logs.verify();
    }

    async waitToasters() {
        const EC = protractor.ExpectedConditions;
        await browser.wait(EC.visibilityOf(element(by.css('.toast'))), 20000);

        await element.all(by.css('.toast')).each(toast => {
            toast.isPresent().then(function (present) {
                if (!present) {
                    return;
                }
                toast.getText().then(function (text) {
                    console.log('Click ' + text);
                });
                toast.click();
            });
        });

        console.log('All clicked! waiting toasters to be gone...');
        await browser.wait(() => {
            return element.all(by.css('.toast')).count()
                .then(function (count) {
                    return count === 0;
                });
        }, 10000);
    }

}

module.exports = Common;
