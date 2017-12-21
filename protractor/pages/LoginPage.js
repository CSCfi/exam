var LoginPage = function () {

    this.load = function () {
        browser.get('/');
    };

    this.login = function (username, password) {
        element(by.model('$ctrl.credentials.username')).sendKeys(username);
        element(by.model('$ctrl.credentials.password')).sendKeys(password);
        element(by.id('submit')).click();
    };

    this.logout = function () {
        element(by.css('a[href="/logout"]')).click();
        expect(browser.getCurrentUrl()).toEqual(browser.baseUrl + '/');
    };

    this.selectRole = function (role) {
        var roleLocator = element(by.id('dropDownMenu1'));
        browser.wait(EC.visibilityOf(roleLocator), 5000);
        roleLocator.click();
        var roleElement = null;
        if (role === 'admin')
            roleElement = element(by.css('.fa-cog'));
        else if (role === 'teacher')
            roleElement = element(by.css('.fa-university'));
        else
            roleElement = element(by.css('.fa-graduation-cap'));

        roleElement.click();
    };
};
module.exports = LoginPage;
