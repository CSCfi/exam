(function () {
    'use strict';
    angular.module('exam.services')
        .service('questionService', ['$q', '$translate', '$location', '$sessionStorage', 'QuestionRes',
            function ($q, $translate, $location, $sessionStorage, QuestionRes) {

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
                                if (sectionQuestion.evaluationType === "Selection" && sectionQuestion.essayAnswer) {
                                    if (sectionQuestion.essayAnswer.evaluatedScore == 1) {
                                        data.accepted++;
                                    } else if (sectionQuestion.essayAnswer.evaluatedScore == 0) {
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
                self.calculateDefaultMaxPoints = function (question) {
                    return (question.options.filter(function (option) {
                        return option.defaultScore > 0;
                    }).reduce(function (a, b) {
                        return a + b.defaultScore;
                    }, 0));
                };

                // For weighted mcq
                self.calculateMaxPoints = function (sectionQuestion) {
                    return (sectionQuestion.options.filter(function (option) {
                        return option.score > 0;
                    }).reduce(function (a, b) {
                        return a + b.score;
                    }, 0));
                };

                self.scoreWeightedMultipleChoiceAnswer = function (sectionQuestion) {
                    var score = sectionQuestion.options.filter(function (o) {
                        return o.answered;
                    }).reduce(function (a, b) {
                        return a + b.score;
                    }, 0);
                    return Math.max(0, score);
                };

                // For non-weighted mcq
                self.scoreMultipleChoiceAnswer = function (sectionQuestion) {
                    var selected = sectionQuestion.options.filter(function (o) {
                       return o.answered;
                    });
                    if (selected.length === 0) {
                        return 0;
                    }
                    if (selected.length != 1) {
                        console.error("multiple options selected for a MultiChoice answer!");
                    }
                    if (selected[0].option.correctOption === true) {
                        return sectionQuestion.maxScore;
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

                self.updateQuestion = function (question, displayErrors) {
                    var questionToUpdate = {
                        "id": question.id,
                        "type": question.type,
                        "defaultMaxScore": question.defaultMaxScore,
                        "question": question.question,
                        "shared": question.shared,
                        "defaultAnswerInstructions": question.defaultAnswerInstructions,
                        "defaultEvaluationCriteria": question.defaultEvaluationCriteria
                    };

                    // update question specific attributes
                    switch (questionToUpdate.type) {
                        case 'EssayQuestion':
                            questionToUpdate.defaultExpectedWordCount = question.defaultExpectedWordCount;
                            questionToUpdate.defaultEvaluationType = question.defaultEvaluationType;
                            break;

                        case 'MultipleChoiceQuestion':
                        case 'WeightedMultipleChoiceQuestion':
                            questionToUpdate.options = question.options;
                            break;
                    }
                    var deferred = $q.defer();
                    QuestionRes.questions.update(questionToUpdate,
                        function () {
                            toastr.info($translate.instant("sitnet_question_saved"));
                            deferred.resolve();
                        }, function (error) {
                            if (displayErrors) {
                                toastr.error(error.data);
                            }
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };


            }]);
}());
