(function () {
    'use strict';
    angular.module('sitnet.services')
        .factory('examService', ['$translate', '$q', '$location', 'ExamRes', function ($translate, $q, $location, ExamRes) {

            var createExam = function() {
                ExamRes.draft.get(
                    function (response) {
                        toastr.info($translate("sitnet_exam_added"));
                        $location.path("/exams/addcourse/" + response.id);
                    }, function (error) {
                        toastr.error(error.data);
                    });
            };

            var getExamTypeDisplayName = function(type) {
                var name;
                switch (type) {
                    case 'PARTIAL':
                        name = $translate('sitnet_exam_credit_type_partial');
                        break;
                    case 'FINAL':
                        name = $translate('sitnet_exam_credit_type_final');
                        break;
                    default:
                        break;
                }
                return name;
            };

            var getExamGradeDisplayName = function(grade) {
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
                        name = $translate('sitnet_rejected');
                        break;
                    case 'APPROVED':
                        name = $translate('sitnet_approved');
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

            var getScaleDisplayName = function(type) {
                var name;
                switch (type) {
                    case 'ZERO_TO_FIVE':
                        name = '0-5';
                        break;
                    case 'LATIN':
                        name = 'Improbatur-Laudatur';
                        break;
                    case 'APPROVED_REJECTED':
                        name = $translate('sitnet_evaluation_select');
                        break;
                }
                return name;
            };

            var refreshGradeScales = function () {
                var deferred = $q.defer();
                ExamRes.gradeScales.query(function (scales) {
                    return deferred.resolve(scales.map(function (scale) {
                        scale.name = getScaleDisplayName(scale.description);
                        return scale;
                    }));
                });
                return deferred.promise;
            };

            var setExamOwners = function (parentExam) {
                parentExam.examTeachers = [];
                parentExam.teachersStr = "";
                angular.forEach(parentExam.examOwners, function(owner){
                    if(parentExam.examTeachers.indexOf(owner.firstName + " " + owner.lastName) === -1) {
                        parentExam.examTeachers.push(owner.firstName + " " + owner.lastName);
                    }
                });
                parentExam.teachersStr = parentExam.examTeachers.map(function(teacher) {
                    return teacher;
                }).join(", ");
            };

            var setExamOwnersAndInspectors = function (childExam) {
                childExam.examTeachers = [];
                childExam.teachersStr = "";

                angular.forEach(childExam.examInspections, function (inspection) {
                    if(childExam.examTeachers.indexOf(inspection.user.firstName + " " + inspection.user.lastName) === -1) {
                        childExam.examTeachers.push(inspection.user.firstName + " " + inspection.user.lastName);
                    }
                });
                angular.forEach(childExam.parent.examOwners, function(owner){
                    if(childExam.examTeachers.indexOf(owner.firstName + " " + owner.lastName) === -1) {
                        childExam.examTeachers.push(owner.firstName + " " + owner.lastName);
                    }
                });
                childExam.teachersStr = childExam.examTeachers.map(function(teacher) {
                    return teacher;
                }).join(", ");
            };

            var setCredit = function (exam) {
                if(exam.customCredit !== undefined && exam.customCredit) {
                    exam.credit = exam.customCredit;
                } else {
                    exam.course && exam.course.credits ? exam.credit = exam.course.credits : exam.credit = 0;
                }
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
                setCredit: setCredit
            };

        }]);
}());
