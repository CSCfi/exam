var QuestionPage = function () {


    this.findQuestions = function (index) {
        return element.all(by.repeater('question in filteredQuestions')).get(index);
    };


};
module.exports = QuestionPage;