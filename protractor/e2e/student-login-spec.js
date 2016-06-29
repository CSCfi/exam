var LoginPage = require('../pages/LoginPage');
var StudentDashboard = require('../pages/StudentDashboard');
var Fixture = require('../fixtures/Fixture');

describe('Exam student login', function () {

    var loginPage = new LoginPage();
    var studentDashboard = new StudentDashboard();
    var fixture = new Fixture();

    beforeEach(function () {
        fixture.loadFixture();
        loginPage.load();
    });

    afterEach(function () {
        loginPage.logout();
    });

    it('should open student dashboard', function () {
        // LOGIN
        loginPage.login('saulistu', 'saulistu');
        // SELECT ROLE
        loginPage.selectRole('student');

        // CHECK LANGUAGE SELECTION
        studentDashboard.selectLanguage(0); // fi
        studentDashboard.checkHeader('Tervetuloa, Sauli Student');

        studentDashboard.selectLanguage(1); // sv
        studentDashboard.checkHeader('Välkommen, Sauli Student');

        studentDashboard.selectLanguage(2); // en
        studentDashboard.checkHeader('Welcome, Sauli Student');

        // CHECK NAVBAR USER NAME
        studentDashboard.checkNavbarUserName('Sauli', 'Student');

        // CHECK NAVBAR LINKS
        studentDashboard.checkNavbarLinks();
    });
});
