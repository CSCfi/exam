var TeacherDashboard = function () {

    this.checkHeader = function (header) {
        var el = element(by.css('.header-text'));
        expect(el.getText()).toContain(header);
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
        expect(links.get(2).isDisplayed()).toBe(true);
        expect(links.get(3).isDisplayed()).toBe(true);
        expect(links.get(4).isDisplayed()).toBe(true);
        expect(links.get(5).isDisplayed()).toBe(false);
        expect(links.get(6).isDisplayed()).toBe(false);
        expect(links.get(7).isDisplayed()).toBe(false);
        expect(links.get(8).isDisplayed()).toBe(false);
        expect(links.get(9).isDisplayed()).toBe(false);
        expect(links.get(10).isDisplayed()).toBe(false);
        expect(links.get(11).isDisplayed()).toBe(true); // LOGOUT
        expect(links.get(12).isDisplayed()).toBe(false);
    };

    this.getActiveExams = function () {
        return element.all(by.repeater('exam in activeExams'));
    };

    this.createNewExam = function (type) {
        element.all(by.xpath('//a[@data-toggle=\'dropdown\']')).get(1).click();
        element.all(by.repeater('type in executionTypes')).get(type).click();
        expect(browser.getCurrentUrl()).toContain('/exams/course');
    };

    this.selectCourse = function (code) {
        element(by.model('newExam.course.code')).sendKeys(code);
        element.all(by.repeater('match in matches track by $index')).first().click();

        element(by.xpath('//input[@type=\'button\']')).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/exams\/\d{4}/);
    }
};
module.exports = TeacherDashboard;