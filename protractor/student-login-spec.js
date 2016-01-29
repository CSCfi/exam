describe('exam student login', function () {
    it('should open student dashboard', function () {
        browser.get('http://localhost:9000');

        // LOG IN
        element(by.model('credentials.username')).sendKeys('saulistu');
        element(by.model('credentials.password')).sendKeys('saulistu');
        element(by.id('submit')).click();

        // SELECT ROLE
        var roleLocator = element(by.id('dropDownMenu1'));
        browser.wait(EC.visibilityOf(roleLocator), 5000);
        roleLocator.click();
        var studentRoleLocator = element(by.css('.fa-graduation-cap'));
        studentRoleLocator.click();

        // CHECK HEADER
        var greeting = element(by.css('.header-text'));
        expect(greeting.getText()).toContain('Sauli Student');

        // CHECK LANGUAGE SELECTION
        element.all(by.css('.locale-item')).get(0).click();
        expect(greeting.getText()).toContain('Tervetuloa');

        element.all(by.css('.locale-item')).get(1).click();
        expect(greeting.getText()).toContain('Välkommen');

        element.all(by.css('.locale-item')).get(2).click();
        expect(greeting.getText()).toContain('Welcome');

        // CHECK NAVBAR USER NAME
        var username = element(by.css('.user-name'));
        expect(username.getText()).toContain('Sauli');
        expect(username.getText()).toContain('Student');

        // CHECK NAVBAR LINKS
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
    });
});
