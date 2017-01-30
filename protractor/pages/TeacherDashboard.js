var TeacherDashboard = function () {

    this.checkTitle = function (header) {
        var el = element(by.css('.student-enroll-title'));
        expect(el.getText()).toContain(header);
    };

    this.getActiveExams = function () {
        return element.all(by.repeater('exam in activeExams'));
    };

    this.getFinishedExams = function () {
        return element.all(by.repeater('exam in finishedExams'));
    };

    this.selectTab = function (index) {
        var navTabs = element(by.css('.nav-tabs'));
        navTabs.all(by.css('a')).get(index).click();
    };

    this.createNewExam = function () {
        element(by.css('a[href*="/newExam/"]')).click();
        expect(browser.getCurrentUrl()).toContain('/exams/course/newExam');
    };

    this.questionPage = function () {
        element.all(by.repeater('link in links')).get(2).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/questions/);
    };

};
module.exports = TeacherDashboard;