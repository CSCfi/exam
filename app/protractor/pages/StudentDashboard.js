class StudentDashboard {

    checkTitle(text) {
        var el = element(by.css('.student-enroll-title'));
        expect(el.getText()).toContain(text);
    }
}

module.exports = StudentDashboard;