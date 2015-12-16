(function () {
    'use strict';
    angular.module('exam.services')
        .service('examService', ['$translate', '$q', '$location', 'ExamRes', function ($translate, $q, $location, ExamRes) {

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

            self.showFeedback = function (examId) {
                $location.path("/feedback/exams/" + examId);
            };

            self.createExam = function (executionType) {
                ExamRes.draft.get({executionType: executionType},
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
                    exam.course && exam.course.credits ? exam.credit = exam.course.credits : exam.credit = 0;
                }
            };

            self.setQuestionColors = function (question) {
                var isAnswered;
                switch (question.type) {
                    case 'EssayQuestion':
                        if (question.answer && question.answer.answer && self.stripHtml(question.answer.answer).length > 0) {
                            isAnswered = true;
                        }
                        break;
                    case 'MultipleChoiceQuestion':
                    case 'WeightedMultipleChoiceQuestion':
                        if (question.answer && question.answer.options.length > 0) {
                            isAnswered = true;
                        }
                        break;
                    default:
                        break;
                }
                if (isAnswered) {
                    question.answered = true;
                    question.questionStatus = $translate.instant("sitnet_question_answered");
                    question.selectedAnsweredState = 'question-answered-header';
                } else {
                    question.answered = false;
                    question.questionStatus = $translate.instant("sitnet_question_unanswered");
                    question.selectedAnsweredState = 'question-unanswered-header';
                }
            };

            self.stripHtml = function (text) {
                if (text && text.indexOf("math-tex") === -1) {
                    return String(text).replace(/<[^>]+>/gm, '');
                }
                return text;
            };

            // Defining markup outside templates is not advisable, but creating a working custom dialog template for this
            // proved to be a bit too much of a hassle. Lets live with this.
            self.getRecordReviewConfirmationDialogContent = function (feedback) {
                return '<h4>' + $translate.instant('sitnet_teachers_comment') + '</h4>'
                    + feedback + '<br/><strong>' + $translate.instant('sitnet_confirm_record_review') + '</strong>';
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
            }

        }]);
}());
