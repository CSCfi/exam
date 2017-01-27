var LoginPage = require('../pages/LoginPage');
var TeacherDashboard = require('../pages/TeacherDashboard');
var ExamEditor = require('../pages/ExamEditor');
var Fixture = require('../fixtures/Fixture');
var PreviewExam = require('../pages/PreviewExam');

describe('Exam teacher', function () {

    var loginPage = new LoginPage();
    var teacherDashboard = new TeacherDashboard();
    var examEditor = new ExamEditor();
    var previewExam = new PreviewExam();
    var fixture = new Fixture();
    var script = 'test_dump.sql';

    beforeEach(function () {
        fixture.loadFixture(script);
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
        teacherDashboard.checkTitle('Työpöytä');

        expect(teacherDashboard.getActiveExams().count()).toBe(4);
    });

    it('should fill and preview new exam', function () {
        teacherDashboard.createNewExam(0); //general exam
        teacherDashboard.selectCourse('IBU2LK002');

        var section = examEditor.findSection(0);
        examEditor.setExamName('Test Exam');
        section.click(); // Blur from input

        examEditor.setInstructions('Test instruction');
        section.click(); //Blur from input
        
        var executionType = examEditor.findExecutionType(0);
        executionType.click(); //Blur from input


        examEditor.setSectionName(section, 'Section A');
        section.click(); // Blur from input

        var question = examEditor.selectQuestionsFromLibrary(0);
        examEditor.openQuestionLibraryForSection(section, question);
        examEditor.previewExam();
        previewExam.leaveInstructionsPage();
    });
});