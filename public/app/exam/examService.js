(function () {
    'use strict';
    angular.module('exam.services')
        .factory('examService', ['$translate', '$q', '$location', 'ExamRes', function ($translate, $q, $location, ExamRes) {

            var createExam = function (executionType) {
                ExamRes.draft.get({executionType: executionType},
                    function (response) {
                        toastr.info($translate.instant("sitnet_exam_added"));
                        $location.path("/exams/course/" + response.id);
                    }, function (error) {
                        toastr.error(error.data);
                    });
            };

            var getExamTypeDisplayName = function (type) {
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

            var getExamGradeDisplayName = function (grade) {
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

            var refreshExamTypes = function () {
                var deferred = $q.defer();
                ExamRes.examTypes.query(function (examTypes) {
                    return deferred.resolve(examTypes.map(function (examType) {
                        examType.name = getExamTypeDisplayName(examType.type);
                        return examType;
                    }));
                });
                return deferred.promise;
            };

            var getScaleDisplayName = function (type) {
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

            var refreshGradeScales = function () {
                var deferred = $q.defer();
                ExamRes.gradeScales.query(function (scales) {
                    return deferred.resolve(scales.map(function (scale) {
                        scale.name = getScaleDisplayName(scale);
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

            var setExamOwners = function (exam) {
                exam.teachersStr = unique(exam.examOwners, JSON.stringify).map(function (owner) {
                    return owner.firstName + " " + owner.lastName;
                }).join(", ");
            };

            var setExamOwnersAndInspectors = function (exam, highlightOwners) {
                var owners;
                if (!exam.examOwners || exam.examOwners.length == 0) {
                    owners = exam.parent ? exam.parent.examOwners || [] : [];
                } else {
                    owners = exam.examOwners || [];
                }
                exam.examOwners = owners;
                exam.examInspections = exam.examInspections || [];
                if (highlightOwners) {
                    exam.examOwners.forEach(function (owner) {
                        owner.isOwner = true;
                    });
                }
                exam.teachersStr = unique(exam.examOwners.concat(exam.examInspections.map(
                    function (ei) {
                        return ei.user
                    })), function (person) {
                    return person.id
                }).map(function (person) {
                    var name = person.firstName + " " + person.lastName;
                    if (person.isOwner) {
                        return '<b>' + name + '</b>';
                    }
                    return name;
                }).join(", ");
            };

            var setCredit = function (exam) {
                if (exam.customCredit !== undefined && exam.customCredit) {
                    exam.credit = exam.customCredit;
                } else {
                    exam.course && exam.course.credits ? exam.credit = exam.course.credits : exam.credit = 0;
                }
            };

            var setQuestionColors = function (question) {
                var isAnswered;
                switch (question.type) {
                    case 'EssayQuestion':
                        if (question.answer && question.answer.answer && stripHtml(question.answer.answer).length > 0) {
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

            var stripHtml = function (text) {
                if (text && text.indexOf("math-tex") === -1) {
                    return String(text).replace(/<[^>]+>/gm, '');
                }
                return text;
            };

            // Defining markup outside templates is not advisable, but creating a working custom dialog template for this
            // proved to be a bit too much of a hassle. Lets live with this.
            var getRecordReviewConfirmationDialogContent = function (feedback) {
                return '<h4>' + $translate.instant('sitnet_teachers_comment') + '</h4>'
                    + feedback + '<br/><strong>' + $translate.instant('sitnet_confirm_record_review') + '</strong>';
            };

            return {
                createExam: createExam,
                refreshExamTypes: refreshExamTypes,
                refreshGradeScales: refreshGradeScales,
                getScaleDisplayName: getScaleDisplayName,
                getExamTypeDisplayName: getExamTypeDisplayName,
                getExamGradeDisplayName: getExamGradeDisplayName,
                setExamOwners: setExamOwners,
                setExamOwnersAndInspectors: setExamOwnersAndInspectors,
                setCredit: setCredit,
                setQuestionColors: setQuestionColors,
                stripHtml: stripHtml,
                getRecordReviewConfirmationDialogContent: getRecordReviewConfirmationDialogContent
            };

        }]);
}());
