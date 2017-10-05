'use strict';
angular.module('app.enrolment')
    .component('enrolmentDetails', {
        templateUrl: '/assets/app/enrolment/exams/examEnrolmentDetails.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['examService', 'Enrolment', 'dateService',
            function (examService, Enrolment, dateService) {

                var vm = this;

                vm.enrollForExam = function () {
                    Enrolment.checkAndEnroll(vm.exam);
                };

                vm.translateExamType = function () {
                    return examService.getExamTypeDisplayName(vm.exam.examType.type);
                };

                vm.translateGradeScale = function () {
                    return examService.getScaleDisplayName(vm.exam.gradeScale || vm.exam.course.gradeScale);
                };

                vm.printExamDuration = function () {
                    return dateService.printExamDuration(vm.exam);
                };

            }
        ]
    });
