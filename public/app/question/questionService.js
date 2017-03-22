(function () {
    'use strict';
    angular.module('exam.services')
        .service('questionService', ['$q', '$translate', '$location', '$sessionStorage', 'QuestionRes',
            'ExamSectionQuestionRes', 'Session', 'fileService', 'AttachmentRes',
            function ($q, $translate, $location, $sessionStorage, QuestionRes, ExamSectionQuestionRes, Session,
                      fileService, AttachmentRes) {

                var self = this;

                self.getQuestionDraft = function (type) {
                    var questionType;
                    switch (type) {
                        case 'essay':
                            questionType = 'EssayQuestion';
                            break;
                        case 'multichoice':
                            questionType = 'MultipleChoiceQuestion';
                            break;
                        case 'weighted':
                            questionType = 'WeightedMultipleChoiceQuestion';
                            break;
                        case 'cloze':
                            questionType = 'ClozeTestQuestion';
                            break;
                    }
                    return {
                        examSectionQuestions: [],
                        options: [],
                        questionOwners: [Session.getUser()],
                        state: 'NEW',
                        tags: [],
                        type: questionType
                    };
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
                    if (!sectionQuestion.options) {
                        return 0;
                    }
                    return (sectionQuestion.options.filter(function (option) {
                        return option.score > 0;
                    }).reduce(function (a, b) {
                        return a + b.score;
                    }, 0));
                };

                self.scoreClozeTestAnswer = function (sectionQuestion) {
                    var score = sectionQuestion.clozeTestAnswer.score;
                    return parseFloat(score.correctAnswers * sectionQuestion.maxScore /
                        (score.correctAnswers + score.incorrectAnswers).toFixed(2));
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
                        case "ClozeTestQuestion":
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

                self.loadFilters = function () {
                    if ($sessionStorage.questionFilters) {
                        return JSON.parse($sessionStorage.questionFilters);
                    }
                    return {};
                };

                self.storeFilters = function (filters) {
                    var data = {filters: filters};
                    $sessionStorage.questionFilters = JSON.stringify(data);
                };

                self.range = function (min, max, step) {
                    step |= 1;
                    var input = [];
                    for (var i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

                var getQuestionData = function (question) {
                    var questionToUpdate = {
                        "type": question.type,
                        "defaultMaxScore": question.defaultMaxScore,
                        "question": question.question,
                        "shared": question.shared,
                        "defaultAnswerInstructions": question.defaultAnswerInstructions,
                        "defaultEvaluationCriteria": question.defaultEvaluationCriteria,
                        "questionOwners": question.questionOwners,
                        "tags": question.tags,
                        "options": question.options
                    };
                    if (question.id) {
                        questionToUpdate.id = question.id;
                    }

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
                    return questionToUpdate;
                };

                self.createQuestion = function (question) {
                    var body = getQuestionData(question);
                    var deferred = $q.defer();

                    QuestionRes.questions.create(body,
                        function (response) {
                            toastr.info($translate.instant('sitnet_question_added'));
                            if (question.attachment && question.attachment.modified) {
                                fileService.upload("/app/attachment/question", question.attachment,
                                    {questionId: response.id}, question, null, function () {
                                        deferred.resolve(response);
                                    });
                            } else {
                                deferred.resolve(response);
                            }
                        }, function (error) {
                            deferred.reject(error);
                        }
                    );
                    return deferred.promise;
                };

                self.updateQuestion = function (question, displayErrors) {
                    var body = getQuestionData(question);
                    var deferred = $q.defer();
                    QuestionRes.questions.update(body,
                        function (response) {
                            toastr.info($translate.instant("sitnet_question_saved"));
                            if (question.attachment && question.attachment.modified) {
                                fileService.upload("/app/attachment/question", question.attachment,
                                    {questionId: question.id}, question, null, function () {
                                        deferred.resolve();
                                    });
                            }
                            else if (question.attachment && question.attachment.removed) {
                                AttachmentRes.questionAttachment.remove({id: question.id}, function () {
                                    deferred.resolve(response);
                                });
                            } else {
                                deferred.resolve(response);
                            }
                        }, function (error) {
                            if (displayErrors) {
                                toastr.error(error.data);
                            }
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                self.updateDistributedExamQuestion = function (question, sectionQuestion) {
                    var data = {
                        "id": sectionQuestion.id,
                        "maxScore": sectionQuestion.maxScore,
                        "answerInstructions": sectionQuestion.answerInstructions,
                        "evaluationCriteria": sectionQuestion.evaluationCriteria,
                        "options": sectionQuestion.options,
                        "question": question
                    };

                    // update question specific attributes
                    switch (question.type) {
                        case 'EssayQuestion':
                            data.expectedWordCount = sectionQuestion.expectedWordCount;
                            data.evaluationType = sectionQuestion.evaluationType;
                            break;
                    }
                    var deferred = $q.defer();
                    ExamSectionQuestionRes.distributed.update({id: sectionQuestion.id}, data,
                        function (esq) {
                            if (question.attachment && question.attachment.modified) {
                                fileService.upload("/app/attachment/question", question.attachment,
                                    {questionId: question.id}, question);
                            }
                            if (question.attachment && question.attachment.removed) {
                                AttachmentRes.questionAttachment.remove({id: question.id});
                            }
                            deferred.resolve(esq);
                        }, function (error) {
                            toastr.error(error.data);
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                self.toggleCorrectOption = function (option, options) {
                    option.correctOption = true;
                    angular.forEach(options, function (o) {
                        o.correctOption = o === option;
                    });
                }

            }]);
}());
