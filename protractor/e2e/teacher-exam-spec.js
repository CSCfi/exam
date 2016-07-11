var LoginPage = require('../pages/LoginPage');
var TeacherDashboard = require('../pages/TeacherDashboard');
var ExamEditor = require('../pages/ExamEditor');
var Fixture = require('../fixtures/Fixture');

describe('Exam teacher', function () {

    var loginPage = new LoginPage();
    var teacherDashboard = new TeacherDashboard();
    var examEditor = new ExamEditor();
    var fixture = new Fixture();

    beforeEach(function () {
        fixture.loadFixture();
        loginPage.load();
        loginPage.login('maikaope', 'maikaope');
    });

    afterEach(function () {
        loginPage.logout();
    });

    it('should open dashboard', function () {
        teacherDashboard.checkNavbarUserName('Olli', 'Opettaja');
        teacherDashboard.checkNavbarLinks();

        teacherDashboard.selectLanguage(0); // fi
        teacherDashboard.checkHeader('Työpöytä');

        expect(teacherDashboard.getActiveExams().count()).toBe(4);
    });

    it('should create new exam', function () {
        teacherDashboard.createNewExam(0); //general exam
        teacherDashboard.selectCourse('IBU2LK002');

        var section = examEditor.findSection(0);
        examEditor.setExamName('Test Exam');
        section.click(); // Blur from input

        examEditor.setSectionName(section, 'Section A');
        section.click(); // Blur from input

        var question = examEditor.findQuestion(0);
        examEditor.dragQuestionFromLibrary(section, question);
        examEditor.publishExam(); 
    });
});
