var ExamEditor = function () {

    this.setExamName = function (name) {
        return element(by.model('newExam.name')).sendKeys(name);
    };

    this.changeTab = function (tab) {
        element(by.css('.nav-tabs')).all(by.css('a')).get(tab).click();
    };

    this.findSection = function (index) {
        return element.all(by.repeater('section in newExam.examSections')).get(index);
    };

    this.selectQuestionsFromLibrary = function (indexes) {
        var questions = element.all(by.css('.questionToUpdate'));
        var selectedQuestions = [];
        for (var index = 0; index < indexes.length; index++) {
            var question = questions.get(index);
            question.click();
            var q = {};
            q.name = question.element(by.xpath('//td[@class="question-table-name"]//p')).getInnerHtml();
            console.log("Question: " + q.name);
            selectedQuestions.push(q);
        }
        return selectedQuestions;
    };

    this.addQuestionsToExam = function () {
        element(by.css('a[ng-click="addQuestions()"]')).click();
    };

    this.findExecutionType = function (index) {
        return element.all(by.repeater('x in range(1, 5)')).get(index);
    };

    this.setInstructions = function (instruction) {
        element(by.model('newExam.instruction')).sendKeys(instruction);
    };

    this.setSectionName = function (section, name) {
        section.element(by.model('section.name')).sendKeys(name);
    };

    this.selectType = function (type) {
        element(by.id('createExam')).all(by.css('option')).get(type).click();
    };

    this.selectCourse = function (code) {
        element(by.model('newExam.course.code')).sendKeys(code);
        element.all(by.repeater('match in matches track by $index')).first().click();
    };

    this.continueToExam = function () {
        element(by.css('button[ng-click="continueToExam()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/exams\/examTabs\/\d{4}\/\d/);
    };

    this.openQuestionLibraryForSection = function (section) {
        section.element(by.css('a[ng-click="openLibrary(section)"]')).click();
    };

    this.validateSectionQuestions = function (section, expectedQuestions) {
        var actualQuestions = section.all(by.xpath('//div[contains(@class, "review-question-title")]//p'));
        for (var i = 0; i < expectedQuestions.length; i++) {
            expect(actualQuestions.get(i).getInnerHtml(), expectedQuestions[i].name);
        }
    };

    this.publishExam = function () {
        element(by.css('a[ng-click="saveAndPublishExam()"]')).click();
        var dialog = element(by.id('sitnet-dialog'));
        browser.wait(EC.visibilityOf(dialog), 5000);
        dialog.element(by.css('button[ng-click="ok()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(browser.baseUrl + '\/*');
    };

    this.previewExam = function () {
        element(by.xpath('//button[@ng-click=\'previewExam()\']')).click();
        //element(by.xpath('//button[@ng-click=\'setNextSection()\']')).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/preview/);
    };
};
module.exports = ExamEditor;