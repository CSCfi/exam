class NavBar {

    async selectLanguage(language) {
        const selector = 'a[ng-click="$ctrl.switchLanguage(\'' + language + '\')"]';
        await element(by.css(selector)).click();
    }

    checkUserName(firstname, lastname) {
        const username = element(by.css('.user-name'));
        expect(username.getText()).toContain(firstname);
        expect(username.getText()).toContain(lastname);
    }

    // Needs remake
    checkLinks(linkItems) {
        var navBody = element(by.css(".nav-body"));
        var links = navBody.all(by.repeater('link in $ctrl.links'));
        expect(links.count()).toEqual(linkItems.length);
        linkItems.forEach((item, index) =>
            expect(links.get(index).isDisplayed()).toBe(item, "Link item number " + index)
        );
    }
}

module.exports = NavBar;
