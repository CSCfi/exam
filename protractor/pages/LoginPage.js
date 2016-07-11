var LoginPage = function () {

    this.load = function () {
        browser.get('/');
    };

     this.login = function (username, password) {
        element(by.model('credentials.username')).sendKeys(username);
        element(by.model('credentials.password')).sendKeys(password);
        element(by.id('submit')).click();
    };

    this.logout = function () {
        element(by.xpath('//a[@href=\'/logout\']')).click();
        expect(browser.getCurrentUrl()).toContain('/login');
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