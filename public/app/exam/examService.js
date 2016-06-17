(function () {
    'use strict';
    angular.module('exam.services')
        .service('examService', ['$translate', '$q', '$location', 'ExamRes', 'questionService', 'sessionService',
            function ($translate, $q, $location, ExamRes, questionService, sessionService) {

                var self = this;

                self.getReviewablesCount = function (exam) {
                    return exam.children.filter(function (child) {
                        return child.state === 'REVIEW' || child.state === 'REVIEW_STARTED';
                    }).length;
                };

                self.getGradedCount = function (exam) {
                    return exam.children.filter(function (child) {
                        return child.state === 'GRADED';
                    }).length;
                };

                self.getProcessedCount = function (exam) {
                    return exam.children.filter(function (child) {
                        return ['REVIEW', 'REVIEW_STARTED', 'GRADED'].indexOf(child.state) == -1;
                    }).length;
                };

                self.showFeedback = function (examId) {
                    $location.path("/feedback/exams/" + examId);
                };

                self.createExam = function (executionType) {
                    ExamRes.draft.create({executionType: executionType},
                        function (response) {
                            toastr.info($translate.instant("sitnet_exam_added"));
                            $location.path("/exams/course/" + response.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                self.getExamTypeDisplayName = function (type) {
                    var name;
                    switch (type) {
                        case 'PARTIAL':
                            name = $translate.instant('sitnet_exam_credit_type_partial');
                            break;
                        case 'FINAL':
                            name = $translate.instant('sitnet_exam_credit_type_final');
                            break;
                        default:
                            break;
                    }
                    return name;
                };

                self.getExamGradeDisplayName = function (grade) {
                    var name;
                    switch (grade) {
                        case 'NONE':
                            name = $translate.instant('sitnet_no_grading');
                            break;
                        case 'I':
                            name = 'Improbatur';
                            break;
                        case 'A':
                            name = 'Approbatur';
                            break;
                        case 'B':
                            name = 'Lubenter approbatur';
                            break;
                        case 'N':
                            name = 'Non sine laude approbatur';
                            break;
                        case 'C':
                            name = 'Cum laude approbatur';
                            break;
                        case 'M':
                            name = 'Magna cum laude approbtur';
                            break;
                        case 'E':
                            name = 'Eximia cum laude approbatur';
                            break;
                        case 'L':
                            name = 'Laudatur approbatur';
                            break;
                        case 'REJECTED':
                            name = $translate.instant('sitnet_rejected');
                            break;
                        case 'APPROVED':
                            name = $translate.instant('sitnet_approved');
                            break;
                        default:
                            name = grade;
                            break;
                    }
                    return name;
                };

                self.refreshExamTypes = function () {
                    var deferred = $q.defer();
                    ExamRes.examTypes.query(function (examTypes) {
                        return deferred.resolve(examTypes.map(function (examType) {
                            examType.name = self.getExamTypeDisplayName(examType.type);
                            return examType;
                        }));
                    });
                    return deferred.promise;
                };

                self.getScaleDisplayName = function (type) {
                    var name;
                    var description = type.description || type;
                    switch (description) {
                        case 'ZERO_TO_FIVE':
                            name = '0-5';
                            break;
                        case 'LATIN':
                            name = 'Improbatur-Laudatur';
                            break;
                        case 'APPROVED_REJECTED':
                            name = $translate.instant('sitnet_evaluation_select');
                            break;
                        case 'OTHER':
                            name = type.displayName || type;
                    }
                    return name;
                };

                self.refreshGradeScales = function () {
                    var deferred = $q.defer();
                    ExamRes.gradeScales.query(function (scales) {
                        return deferred.resolve(scales.map(function (scale) {
                            scale.name = self.getScaleDisplayName(scale);
                            return scale;
                        }));
                    });
                    return deferred.promise;
                };

                var unique = function (array, key) {
                    var seen = {};
                    return array.filter(function (item) {
                        var k = key(item);
                        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
                    });
                };

                self.setCredit = function (exam) {
                    if (exam.customCredit !== undefined && exam.customCredit) {
                        exam.credit = exam.customCredit;
                    } else {
                        exam.credit = exam.course && exam.course.credits ? exam.course.credits : 0;
                    }
                };

                self.setQuestionColors = function (sectionQuestion) {
                    var isAnswered;
                    switch (sectionQuestion.question.type) {
                        case 'EssayQuestion':
                            var essayAnswer = sectionQuestion.essayAnswer;
                            if (essayAnswer && essayAnswer.answer &&
                                self.stripHtml(essayAnswer.answer).length > 0) {
                                isAnswered = true;
                            }
                            break;
                        case 'MultipleChoiceQuestion':
                        case 'WeightedMultipleChoiceQuestion':
                            isAnswered = sectionQuestion.options.filter(function (o) {
                                    return o.answered;
                                }).length > 0;
                            break;
                        default:
                            break;
                    }
                    if (isAnswered) {
                        sectionQuestion.answered = true;
                        sectionQuestion.questionStatus = $translate.instant("sitnet_question_answered");
                        sectionQuestion.selectedAnsweredState = 'question-answered-header';
                    } else {
                        sectionQuestion.answered = false;
                        sectionQuestion.questionStatus = $translate.instant("sitnet_question_unanswered");
                        sectionQuestion.selectedAnsweredState = 'question-unanswered-header';
                    }
                };

                self.stripHtml = function (text) {
                    if (text && text.indexOf("math-tex") === -1) {
                        return String(text).replace(/<[^>]+>/gm, '');
                    }
                    return text;
                };

                self.listExecutionTypes = function () {
                    var deferred = $q.defer();
                    ExamRes.executionTypes.query(function (types) {
                        types.forEach(function (t) {
                            if (t.type === 'PUBLIC') {
                                t.name = 'sitnet_public_exam';
                            }
                            if (t.type === 'PRIVATE') {
                                t.name = 'sitnet_private_exam';
                            }
                            if (t.type === 'MATURITY') {
                                t.name = 'sitnet_maturity';
                            }
                        });
                        return deferred.resolve(types);
                    });
                    return deferred.promise;
                };

                self.getExecutionTypeTranslation = function (type) {
                    var translation;
                    if (type === 'PUBLIC') {
                        translation = 'sitnet_public_exam';
                    }
                    if (type === 'PRIVATE') {
                        translation = 'sitnet_private_exam';
                    }
                    if (type === 'MATURITY') {
                        translation = 'sitnet_maturity';
                    }
                    return translation;
                };

                self.getSectionTotalScore = function (section) {
                    var score = 0;

                    section.sectionQuestions.forEach(function (sq) {
                        switch (sq.question.type) {
                            case "MultipleChoiceQuestion":
                                score += questionService.scoreMultipleChoiceAnswer(sq);
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                score += questionService.scoreWeightedMultipleChoiceAnswer(sq);
                                break;
                            case "EssayQuestion":
                                if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Points') {
                                    var number = parseFloat(sq.essayAnswer.evaluatedScore);
                                    if (angular.isNumber(number)) {
                                        score += number;
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                    });
                    return score;
                };

                self.getSectionMaxScore = function (section) {
                    var score = 0;
                    section.sectionQuestions.forEach(function (sq) {
                        if (!sq || !sq.question) {
                            return;
                        }
                        switch (sq.question.type) {
                            case "MultipleChoiceQuestion":
                                score += sq.maxScore;
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                score += questionService.calculateMaxPoints(sq);
                                break;
                            case "EssayQuestion":
                                if (sq.evaluationType == 'Points') {
                                    score += sq.maxScore;
                                }
                                break;
                            default:
                                break;
                        }
                    });
                    if (section.lotteryOn) {
                        score = score * section.lotteryItemCount / Math.max(1, section.sectionQuestions.length);
                    }
                    return score;
                };

                self.hasQuestions = function (exam) {
                    if (!exam || !exam.examSections) {
                        return false;
                    }
                    return exam.examSections.reduce(function (a, b) {
                            return a + b.sectionQuestions.length;
                        }, 0) > 0;
                };

                self.hasEssayQuestions = function (exam) {
                    if (!exam || !exam.examSections) {
                        return false;
                    }
                    return exam.examSections.filter(function (es) {
                            return es.sectionQuestions.some(function (sq) {
                                return sq.question.type === "EssayQuestion";
                            });
                        }).length > 0;
                };

                self.getMaxScore = function (exam) {
                    if (!exam || !exam.examSections) {
                        return 0;
                    }
                    var total = 0;
                    exam.examSections.forEach(function (section) {
                        total += self.getSectionMaxScore(section);
                    });
                    return total;
                };

                self.getTotalScore = function (exam) {
                    if (!exam || !exam.examSections) {
                        return 0;
                    }
                    var total = 0;
                    exam.examSections.forEach(function (section) {
                        total += self.getSectionTotalScore(section);
                    });
                    return total;
                };

                self.isOwner = function (exam) {
                    var user = sessionService.getUser();
                    return exam && exam.parent.examOwners.filter(function (o) {
                            return o.id === user.id;
                        }).length > 0;
                };

                self.isOwnerOrAdmin = function (exam) {
                    return exam && (sessionService.getUser().isAdmin || self.isOwner(exam));
                };

            }]);
}());
