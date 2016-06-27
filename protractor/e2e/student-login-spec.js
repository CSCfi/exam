var LoginPage = require('../pages/LoginPage');
var StudentDashboard = require('../pages/StudentDashboard');

describe('exam student login', function () {

    var loginPage = new LoginPage();
    var studentDashboard = new StudentDashboard();

    beforeEach(function () {
        loginPage.load();
    });

    it('should open student dashboard', function () {
        // LOGIN
        loginPage.login('saulistu', 'saulistu');
        // SELECT ROLE
        loginPage.selectRole('student');

        // CHECK LANGUAGE SELECTION
        studentDashboard.selectLanguage(0); // fi
        studentDashboard.checkGreeting('Tervetuloa, Sauli Student');

        studentDashboard.selectLanguage(1); // sv
        studentDashboard.checkGreeting('Välkommen, Sauli Student');

        studentDashboard.selectLanguage(2); // en
        studentDashboard.checkGreeting('Welcome, Sauli Student');

        // CHECK NAVBAR USER NAME
        studentDashboard.checkNavbarUserName('Sauli', 'Student');

        // CHECK NAVBAR LINKS
        studentDashboard.checkNavbarLinks();
    });
});
