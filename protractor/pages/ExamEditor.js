let ExamEditor = function () {

    this.setExamName = function (name) {
        return element(by.model('$ctrl.exam.name')).sendKeys(name);
    };

    this.changeTab = function (tab) {
        element(by.css('.nav-tabs')).all(by.css('a')).get(tab).click();
    };

    this.findSection = function (index) {
        return element.all(by.repeater('section in $ctrl.exam.examSections')).get(index);
    };

    this.selectQuestionsFromLibrary = function (indexes) {
        const table = element(by.css('tbody'));
        browser.wait(EC.visibilityOf(table), 5000);
        let questions = table.all(by.model('question.selected'));
        return questions.filter(function (q, index) {
            return index in indexes;
        }).map(function (q) {
            browser.wait(EC.visibilityOf(q), 5000).then(function () {
                q.click();
                browser.wait(EC.elementToBeSelected(q), 5000);
            });
            const item = {};
            item.name = q.element(by.xpath('//td[@class="question-table-name"][1]/span')).getText();
            return item;
        })
    };

    this.addQuestionsToExam = function () {
        element(by.css('a[ng-click="$ctrl.addQuestions()"]')).click();
    };

    this.findExecutionType = function (index) {
        return element.all(by.repeater('x in range(1, 5)')).get(index);
    };

    this.setInstructions = function (instruction) {
        element(by.model('$ctrl.exam.instruction')).sendKeys(instruction);
    };

    this.setSectionName = function (section, name) {
        section.element(by.model('$ctrl.section.name')).sendKeys(name);
    };

    this.selectType = function (type) {
        element(by.model('$ctrl.type'))
            .all(by.css('option')).get(type).click();
    };

    this.selectCourse = function (code) {
        element(by.model('$ctrl.exam.course.code')).sendKeys(code);
        element.all(by.repeater('match in matches track by $index')).first().click();
    };

    this.continueToExam = function () {
        element(by.css('button[ng-click="$ctrl.continueToExam()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/exams\/\d+\/\d+/);
    };

    this.openQuestionLibraryForSection = function (section) {
        section.element(by.css('a[ng-click="$ctrl.openLibrary()"]')).click().then(function () {
            const addButton = element(by.css('a[ng-click="$ctrl.addQuestions()'));
            browser.wait(EC.visibilityOf(addButton), 5000);
        });
    };

    this.validateSectionQuestions = function (section, expectedQuestions) {
        let actualQuestions = section.all(by.repeater('sectionQuestion in $ctrl.section.sectionQuestions'));
        expect(actualQuestions.count()).toEqual(expectedQuestions.length);
        for (let i = 0; i < expectedQuestions.length; i++) {
            expect(actualQuestions.get(i).getText(), expectedQuestions[i].name);
        }
    };

    this.publishExam = function () {
        element(by.css('a[ng-click="$ctrl.saveAndPublishExam()"]')).click();
        let dialog = element(by.id('sitnet-dialog'));
        browser.wait(EC.visibilityOf(dialog), 5000);
        dialog.element(by.css('button[ng-click="$ctrl.ok()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(browser.baseUrl + '\/*');
    };

    this.previewExam = function () {
        element(by.css('button[ng-click="$ctrl.previewExam()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/preview/);
    };
};
module.exports = ExamEditor;