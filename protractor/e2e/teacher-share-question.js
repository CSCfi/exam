var LoginPage = require('../pages/LoginPage');
var TeacherDashboard = require('../pages/TeacherDashboard');
var ExamEditor = require('../pages/ExamEditor');
var Fixture = require('../fixtures/Fixture');
var QuestionPage = require('../pages/QuestionPage');

describe('Exam teacher', function () {

    var loginPage = new LoginPage();
    var teacherDashboard = new TeacherDashboard();
    var questionPage = new QuestionPage();
    var fixture = new Fixture();

    beforeEach(function () {

        //variables for new temp teacher
        var id = 807;
        var email = "'fyssaopettaja@funet.fi'";
        var last_name = "'Opettaja'";
        var first_name = "'Liisa'";
        var password = "md5('fyssaope')";
        var lang = "'fi'";

        //fixture.addUser(id, email, last_name, first_name, password, lang);
        fixture.loadFixture();
        loginPage.load();
        loginPage.login('fyssaopettaja', 'fyssaope');
    });

    afterEach(function () {
        loginPage.logout();
    });

    it('should open dashboard', function () {
        teacherDashboard.checkNavbarUserName('Liisa', 'Opettaja');
        teacherDashboard.checkNavbarLinks();
        teacherDashboard.selectLanguage(0); // fi
        teacherDashboard.checkHeader('Työpöytä');

    });

    it('should create a question and join it to test', function () {
        
        var creator_id = "807";
        
        var question_id = "9000";
        var question = "'Is this an e2e test?'";
        var default_max_score = "5";
        var object_version = "1";
        var type = "2";

        var exam_id = "8000";
        var exam_name = "'Unit test exam.'";
        var execution_type_id = "1";
        var state = "2";

        var section_id = "5000";
        var section_name = "'Unit test section'";
        var lottery_item_count = "1";
        var sequence_number = "0";

        var section_question_id = "9600";
        
        //add question and exam to dummy database and join them

        fixture.addQuestion(question_id, question, default_max_score, object_version, type, id);
        fixture.addExam(exam_id, creator_id, exam_name, object_version, execution_type_id, state);
        fixture.addSection(section_id, creator_id, section_name, exam_id, lottery_item_count, object_version, sequence_number);
        fixture.addSectionQuestion(section_id, question_id, sequence_number, section_question_id, creator_id, object_version);

        //jaa kysymys kolmelle muulle opettajalle

        teacherDashboard.questionPage();


    });

    
    it('chooses a question from question page', function () {
        teacherDashboard.questionPage();
        questionPage.findQuestion();



    });



});

/*
* Mene kysymyskirjastoon ja valitse kysymys joka on jo kiinnitetty johonkin tenttiin. Jaa kysymys kolmelle muulle opettajalle (yksi Olli Opettaja) ja tallenna.

 Kirjaudu tämän jälkeen sisään Olli Opettajana ja etsi kysymys kirjastosta. Kiinnitä kysymys Olli Opettajan tenttiluonnokseen.

 Kirjaudu ulos

 Palaa takaisin omalla tunnuksellasi ja poista kysymykseltä jako-oikeus Olli Opettajalle. Onnistuuko tämä, saatko mitään ilmoitusta?

 Kirjaudu sisään Olli Opettajana ja katso miltä tenttiluonnos näyttää: poistuiko kysymys tentistä?
*
* */