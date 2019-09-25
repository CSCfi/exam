class ExamEditor {

    async setExamName(name) {
        return await element(by.model('$ctrl.exam.name')).sendKeys(name);
    }

    async changeTab(tab) {
        await element(by.css('.nav-tabs')).all(by.css('a')).get(tab).click();
    }

    findSection(index) {
        return element.all(by.repeater('section in $ctrl.exam.examSections')).get(index);
    }

    async selectQuestionsFromLibrary(indexes) {
        const table = element(by.css('tbody'));
        await browser.wait(protractor.ExpectedConditions.visibilityOf(table), 5000);
        let questions = table.all(by.model('question.selected'));
        return await questions
            .filter((q, index) => index in indexes)
            .map(async q => {
                await browser.wait(protractor.ExpectedConditions.visibilityOf(q), 5000)
                await q.click();
                await browser.wait(protractor.ExpectedConditions.elementToBeSelected(q), 5000);
                const item = {};
                item.name = q.element(by.xpath('//td[@class="question-table-name"][1]/span')).getText();
                return item;
            })
    }

    async addQuestionsToExam() {
        await element(by.css('a[ng-click="$ctrl.addQuestions()"]')).click();
    }

    findExecutionType(index) {
        return element.all(by.repeater('x in range(1, 5)')).get(index);
    }

    async setInstructions(instruction) {
        element(by.model('$ctrl.exam.instruction')).sendKeys(instruction);
    }

    async setSectionName(section, name) {
        section.element(by.model('$ctrl.section.name')).sendKeys(name);
    }

    async selectType(type) {
        await element(by.model('$ctrl.type'))
            .all(by.css('option')).get(type).click();
    }

    async selectCourse(code) {
        element(by.model('$ctrl.exam.course.code')).sendKeys(code);
        element.all(by.repeater('match in matches track by $index')).first().click();
    }

    async continueToExam() {
        await element(by.css('button[ng-click="$ctrl.continueToExam()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/exams\/\d+\/\d+/);
    }

    async openQuestionLibraryForSection(section) {
        await section.element(by.css('a[ng-click="$ctrl.openLibrary()"]')).click();
        const addButton = element(by.css('a[ng-click="$ctrl.addQuestions()'));
        await browser.wait(protractor.ExpectedConditions.visibilityOf(addButton), 5000);
    }

    validateSectionQuestions(section, expectedQuestions) {
        let actualQuestions = section.all(by.repeater('sectionQuestion in $ctrl.section.sectionQuestions'));
        expect(actualQuestions.count()).toEqual(expectedQuestions.length);
        for (let i = 0; i < expectedQuestions.length; i++) {
            expect(actualQuestions.get(i).getText(), expectedQuestions[i].name);
        }
    }

    async publishExam() {
        await element(by.css('a[ng-click="$ctrl.saveAndPublishExam()"]')).click();
        let dialog = element(by.id('sitnet-dialog'));
        await browser.wait(protractor.ExpectedConditions.visibilityOf(dialog), 5000);
        await dialog.element(by.css('button[ng-click="$ctrl.ok()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(browser.baseUrl + '/*');
    }

    async previewExam() {
        await element(by.css('button[ng-click="$ctrl.previewExam()"]')).click();
        expect(browser.getCurrentUrl()).toMatch(/.+\/preview/);
    }
}

module.exports = ExamEditor;