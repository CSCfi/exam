var StudentDashboard = require('../pages/StudentDashboard');
var NavBar = require("../pages/NavBar");
var Common = require('../pages/Common');

describe('Exam student login', function () {

    var studentDashboard = new StudentDashboard();
    var navBar = new NavBar();
    var common = new Common();

    beforeAll(function () {
        common.beforeAll('saulistu', 'saulistu', 'student');
    });

    beforeEach(function () {
        common.beforeEach();
    });

    afterEach(function () {
        common.afterEach();
    });

    afterAll(function () {
        common.afterAll();
    });

    it('should open student dashboard', function () {
        // CHECK LANGUAGE SELECTION
        navBar.selectLanguage('fi');
        studentDashboard.checkTitle('Ilmoittautumiset');

        navBar.selectLanguage('sv');
        studentDashboard.checkTitle('Bokningar');

        navBar.selectLanguage('en');
        studentDashboard.checkTitle('Locked exams');

        // CHECK NAVBAR USER NAME
        navBar.checkNavbarUserName('Sauli', 'Student');

        // CHECK NAVBAR LINKS
        navBar.checkNavbarLinks([true, false, false, false, false, false, false,
            false, false, false, false, true, true, true, false]);
    });
});
