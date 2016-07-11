var QuestionPage = function () {


    this.findQuestion = function () {
        return element.all(by.repeater('question in filteredQuestions')).get(0).click();
        
    };


};
module.exports = QuestionPage;