class TeacherDashboard {

    checkTitle(header) {
        const el = element(by.css('.student-enroll-title'));
        expect(el.getText()).toContain(header);
    }

    getExams() {
        return element.all(by.repeater('exam in $ctrl.items')).filter(e => e.isDisplayed());
    }

    async selectTab(index) {
        let navTabs = element(by.css('.nav-tabs'));
        await navTabs.all(by.css('a')).get(index).click();
    }

    async createNewExam() {
        await element(by.css('a[href="/exams/new"]')).click();
        expect(browser.getCurrentUrl()).toContain('/exams/new');
    }

    async questionPage() {
        await element.all(by.repeater('link in $ctrl.links')).get(2).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/questions/);
    }

}

module.exports = TeacherDashboard;
