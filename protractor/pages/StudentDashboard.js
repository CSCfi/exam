var StudentDashboard = function () {

    this.checkGreeting = function (greeting) {
        var el = element(by.css('.header-text'));
        expect(el.getText()).toContain(greeting);
    };

    this.selectLanguage = function (language) {
        element.all(by.css('.locale-item')).get(language).click();
    };

    this.checkNavbarUserName = function (firstname, lastname) {
        var username = element(by.css('.user-name'));
        expect(username.getText()).toContain(firstname);
        expect(username.getText()).toContain(lastname);
    };

    this.checkNavbarLinks = function () {
        var links = element.all(by.repeater('link in links'));
        expect(links.count()).toEqual(13);
        expect(links.get(0).isDisplayed()).toBe(true); // DASHBOARD
        expect(links.get(1).isDisplayed()).toBe(false);
        expect(links.get(2).isDisplayed()).toBe(false);
        expect(links.get(3).isDisplayed()).toBe(false);
        expect(links.get(4).isDisplayed()).toBe(false);
        expect(links.get(5).isDisplayed()).toBe(false);
        expect(links.get(6).isDisplayed()).toBe(false);
        expect(links.get(7).isDisplayed()).toBe(false);
        expect(links.get(8).isDisplayed()).toBe(false);
        expect(links.get(9).isDisplayed()).toBe(false);
        expect(links.get(10).isDisplayed()).toBe(true); // EXAM SEARCH
        expect(links.get(11).isDisplayed()).toBe(true); // LOGOUT
        expect(links.get(12).isDisplayed()).toBe(false);
    };
};
module.exports = StudentDashboard;