class QuestionPage {

    findQuestions(index) {
        return element.all(by.repeater('question in filteredQuestions')).get(index);
    }


}

module.exports = QuestionPage;