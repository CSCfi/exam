var StudentDashboard = function () {

    this.checkTitle = function (text) {
        var el = element(by.css('.student-enroll-title'));
        expect(el.getText()).toContain(text);
    };
};
module.exports = StudentDashboard;