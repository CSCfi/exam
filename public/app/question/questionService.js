(function () {
    'use strict';
    angular.module('exam.services')
        .service('questionService', ['$translate', '$location', '$sessionStorage', 'QuestionRes',
            function ($translate, $location, $sessionStorage, QuestionRes) {

                var self = this;

                self.createQuestion = function (type) {
                    QuestionRes.questions.create({type: type},
                        function (response) {
                            toastr.info($translate.instant('sitnet_question_added'));
                            $location.path("/questions/" + response.id);
                        }
                    );
                };

                self.getQuestionAmounts = function (exam) {
                    var data = {accepted: 0, rejected: 0, hasEssays: false};
                    angular.forEach(exam.examSections, function (section) {
                        angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                            var question = sectionQuestion.question;
                            if (question.type === "EssayQuestion") {
                                if (question.evaluationType === "Select") {
                                    if (question.evaluatedScore == 1) {
                                        data.accepted++;
                                    } else if (question.evaluatedScore == 0) {
                                        data.rejected++;
                                    }
                                }
                                data.hasEssays = true;
                            }
                        });
                    });
                    return data;
                };

                // For weighted mcq
                self.calculateMaxPoints = function (question) {
                    return (question.options.filter(function (option) {
                        return option.score > 0;
                    }).reduce(function (a, b) {
                        return a + b.score;
                    }, 0));
                };

                self.scoreWeightedMultipleChoiceAnswer = function (question) {
                    var score = question.options.filter(function (o) {
                        return o.answer;
                    }).reduce(function (a, b) {
                        return a + b.score;
                    }, 0);
                    return Math.max(0, score)
                };

                // For non-weighted mcq
                self.scoreMultipleChoiceAnswer = function (question) {
                    if (!question.answer) {
                        return 0;
                    }
                    if (question.answer.options.length != 1) {
                        console.error("multiple options selected for a MultiChoice answer!");
                    }
                    if (question.answer.options[0].correctOption === true) {
                        return question.maxScore;
                    }
                    return 0;
                };

                self.decodeHtml = function (html) {
                    var txt = document.createElement("textarea");
                    txt.innerHTML = html;
                    return txt.value;
                };

                self.longTextIfNotMath = function (text) {
                    if (text && text.length > 0 && text.indexOf("math-tex") === -1) {
                        // remove HTML tags
                        var str = String(text).replace(/<[^>]+>/gm, '');
                        // shorten string
                        return self.decodeHtml(str);
                    }
                    return "";
                };

                self.shortText = function (text, maxLength) {

                    if (text && text.length > 0 && text.indexOf("math-tex") === -1) {
                        // remove HTML tags
                        var str = String(text).replace(/<[^>]+>/gm, '');
                        // shorten string
                        str = self.decodeHtml(str);
                        return str.length + 3 > maxLength ? str.substr(0, maxLength) + "..." : str;
                    }
                    return text ? self.decodeHtml(text) : "";
                };

                var _filter;

                self.setFilter = function (filter) {
                    switch (filter) {
                        case "MultipleChoiceQuestion":
                        case "WeightedMultipleChoiceQuestion":
                        case "EssayQuestion":
                            _filter = filter;
                            break;
                        default:
                            _filter = undefined;
                    }
                };

                self.applyFilter = function (questions) {
                    if (!_filter) {
                        return questions;
                    }
                    return questions.filter(function (q) {
                        return q.type === _filter;
                    });
                };

                self.loadQuestions = function () {
                    if ($sessionStorage.libraryQuestions) {
                        return JSON.parse($sessionStorage.libraryQuestions);
                    }
                    return {};
                };

                self.storeQuestions = function (questions, filters) {
                    var data = {questions: questions, filters: filters};
                    $sessionStorage.libraryQuestions = JSON.stringify(data);
                };

                self.clearQuestions = function () {
                    delete $sessionStorage.libraryQuestions;
                };

                self.range = function (min, max, step) {
                    step |= 1;
                    var input = [];
                    for (var i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

            }]);
}());
