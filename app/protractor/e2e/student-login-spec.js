var StudentDashboard = require('../pages/StudentDashboard');
var NavBar = require('../pages/NavBar');
var Common = require('../pages/Common');

describe('Exam student login', () => {

    const studentDashboard = new StudentDashboard();
    const navBar = new NavBar();
    const common = new Common();

    beforeEach(async function () {
        await common.beforeEach('saulistu', 'saulistu', 'student');
    });

    afterEach(async function () {
        await common.afterEach();
    });

    afterAll(async () => await common.afterAll());

    it('should open student dashboard', async function () {
        // CHECK LANGUAGE SELECTION
        await navBar.selectLanguage('fi');
        studentDashboard.checkTitle('Ilmoittautumiset');

        await navBar.selectLanguage('sv');
        studentDashboard.checkTitle('Bokningar');

        await navBar.selectLanguage('en');
        studentDashboard.checkTitle('Reservations');

        // CHECK NAVBAR USER NAME
        navBar.checkUserName('Sauli', 'Student');

    });
});
