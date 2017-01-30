var NavBar = function () {

    this.selectLanguage = function (language) {
        var selector = 'a[ng-click="switchLanguage(\'' + language + '\')"]';
        console.log(selector);
        element(by.css(selector)).click();
    };

    this.checkNavbarUserName = function (firstname, lastname) {
        var username = element(by.css('.user-name'));
        expect(username.getText()).toContain(firstname);
        expect(username.getText()).toContain(lastname);
    };

    this.checkNavbarLinks = function (linkItems) {
        var navBody = element(by.css(".nav-body"));
        var links = navBody.all(by.repeater('link in links'));
        expect(links.count()).toEqual(linkItems.length);
        linkItems.forEach(function (item, index) {
            expect(links.get(index).isDisplayed()).toBe(item, "Link item number " + index);
        });
    };
};
module.exports = NavBar;