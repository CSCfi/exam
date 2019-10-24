class LoginPage {

    async load() {
        await browser.get('/');
    }

    async login(username, password) {
        await element(by.model('$ctrl.credentials.username')).sendKeys(username);
        await element(by.model('$ctrl.credentials.password')).sendKeys(password);
        await element(by.id('submit')).click();
    }

    async logout() {
        await element.all(by.css('a[href="/logout"]')).first().click();
        expect(browser.getCurrentUrl()).toEqual(browser.baseUrl + '/');
    }

    async selectRole(role) {
        const roleLocator = element(by.id('dropDownMenu1'));
        const EC = protractor.ExpectedConditions;
        await browser.wait(EC.visibilityOf(roleLocator), 5000);
        await roleLocator.click();
        let roleElement;
        if (role === 'admin')
            roleElement = element(by.css('.fa-cog'));
        else if (role === 'teacher')
            roleElement = element(by.css('.fa-university'));
        else
            roleElement = element(by.css('.fa-graduation-cap'));

        await roleElement.click();
    }
}

module.exports = LoginPage;
