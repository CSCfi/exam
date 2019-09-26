const TeacherDashboard = require('../pages/TeacherDashboard');
const NavBar = require('../pages/NavBar');
let ExamEditor = require('../pages/ExamEditor');
let Common = require('../pages/Common');

describe('Exam teacher', function () {

    let teacherDashboard = new TeacherDashboard();
    let navBar = new NavBar();
    let examEditor = new ExamEditor();
    let common = new Common();

    afterAll(async () => await common.afterAll());

    beforeEach(async () => await common.beforeEach('maikaope', 'maikaope'));

    afterEach(async () => await common.afterEach());

    it('should open dashboard', async () => {
        navBar.checkUserName('Olli', 'Opettaja');

        await navBar.selectLanguage('fi');
        teacherDashboard.checkTitle('Työpöytä');

        expect(teacherDashboard.getExams().count()).toBe(0);

        await teacherDashboard.selectTab(1);

        expect(teacherDashboard.getExams().count()).toBe(0);

        await teacherDashboard.selectTab(3);

        expect(teacherDashboard.getExams().count()).toBe(2);
    });

    it('should create new exam', async () => {

        await teacherDashboard.createNewExam();

        await examEditor.selectType(1);
        await examEditor.selectCourse('IBU2LK002');
        await examEditor.setExamName('Test Exam');

        await examEditor.continueToExam();

        await examEditor.changeTab(1); // Questions tab

        let section = examEditor.findSection(0);
        await examEditor.setSectionName(section, 'Section A');
        await section.click(); // Blur from input

        await examEditor.openQuestionLibraryForSection(section);
        let questions = await examEditor.selectQuestionsFromLibrary([0, 1]);
        expect(questions.length).toBe(2);

        await examEditor.addQuestionsToExam();
        examEditor.validateSectionQuestions(section, questions);

        await common.waitToasters();

        await examEditor.changeTab(2);

        await examEditor.publishExam();

        await teacherDashboard.selectTab(0);

        expect(teacherDashboard.getExams().count()).toBe(1);
    });
});
