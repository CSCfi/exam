var LoginPage = require('../pages/LoginPage');
var TeacherDashboard = require('../pages/TeacherDashboard');
var NavBar = require("../pages/NavBar");
var ExamEditor = require('../pages/ExamEditor');
var Common = require('../pages/Common');

describe('Exam teacher', function () {

    var teacherDashboard = new TeacherDashboard();
    var navBar = new NavBar();
    var examEditor = new ExamEditor();
    var common = new Common();

    beforeAll(function () {
        common.beforeAll('maikaope', 'maikaope');
    });

    afterAll(function () {
        common.afterAll();
    });

    beforeEach(function () {
        common.beforeEach();
    });

    afterEach(function () {
        common.afterEach();
    });

    it('should open dashboard', function () {
        navBar.checkNavbarUserName('Olli', 'Opettaja');
        navBar.checkNavbarLinks([true, false, false, false, false, false, false, false,
            false, true, true, false, false, true, false]);

        navBar.selectLanguage('fi');
        teacherDashboard.checkTitle('Työpöytä');

        expect(teacherDashboard.getActiveExams().count()).toBe(0);

        teacherDashboard.selectTab(1);

        expect(teacherDashboard.getFinishedExams().count()).toBe(0);
    });

    it('should create new exam', function () {
        teacherDashboard.createNewExam();
        examEditor.selectType(1);
        examEditor.selectCourse('IBU2LK002');
        examEditor.continueToExam();

        examEditor.setExamName('Test Exam');
        examEditor.changeTab(1); // Questions tab

        var section = examEditor.findSection(0);
        examEditor.setSectionName(section, 'Section A');
        section.click(); // Blur from input

        examEditor.openQuestionLibraryForSection(section);
        var questions = examEditor.selectQuestionsFromLibrary([0, 1]);
        examEditor.addQuestionsToExam();
        examEditor.validateSectionQuestions(section, questions);

        common.waitToasters();

        examEditor.changeTab(2);

        examEditor.publishExam();

        expect(teacherDashboard.getActiveExams().count()).toBe(1);
    });
});
