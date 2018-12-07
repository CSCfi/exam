let TeacherDashboard = require('../pages/TeacherDashboard');
let NavBar = require("../pages/NavBar");
let ExamEditor = require('../pages/ExamEditor');
let Common = require('../pages/Common');

describe('Exam teacher', function () {

    let teacherDashboard = new TeacherDashboard();
    let navBar = new NavBar();
    let examEditor = new ExamEditor();
    let common = new Common();

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

        expect(teacherDashboard.getExams().count()).toBe(0);

        teacherDashboard.selectTab(1);

        expect(teacherDashboard.getExams().count()).toBe(0);

        teacherDashboard.selectTab(3);

        expect(teacherDashboard.getExams().count()).toBe(2);
    });

    it('should create new exam', function () {
        teacherDashboard.createNewExam();
        examEditor.selectType(1);
        examEditor.selectCourse('IBU2LK002');
        examEditor.continueToExam();

        examEditor.setExamName('Test Exam');
        examEditor.changeTab(1); // Questions tab

        let section = examEditor.findSection(0);
        examEditor.setSectionName(section, 'Section A');
        section.click(); // Blur from input

        examEditor.openQuestionLibraryForSection(section);
        let questions = examEditor.selectQuestionsFromLibrary([0, 1]);
        questions.then(function (list) {
            expect(list.length).toBe(2);
            examEditor.addQuestionsToExam();
            examEditor.validateSectionQuestions(section, list);
        });

        common.waitToasters();

        examEditor.changeTab(2);

        examEditor.publishExam();

        teacherDashboard.selectTab(0);
        expect(teacherDashboard.getExams().count()).toBe(1);
    });
});
