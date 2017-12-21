var TeacherDashboard = function () {

    this.checkTitle = function (header) {
        var el = element(by.css('.student-enroll-title'));
        expect(el.getText()).toContain(header);
    };

    this.getActiveExams = function () {
        return element.all(by.repeater('exam in $ctrl.filteredActive'));
    };

    this.getFinishedExams = function () {
        return element.all(by.repeater('exam in $ctrl.filteredFinished'));
    };

    this.selectTab = function (index) {
        var navTabs = element(by.css('.nav-tabs'));
        navTabs.all(by.css('a')).get(index).click();
    };

    this.createNewExam = function () {
        element(by.css('a[href="/exams/new"]')).click();
        expect(browser.getCurrentUrl()).toContain('/exams/new');
    };

    this.questionPage = function () {
        element.all(by.repeater('link in $ctrl.links')).get(2).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/questions/);
    };

};
module.exports = TeacherDashboard;