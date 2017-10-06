'use strict';
angular.module('app.enrolment')
    .component('enrolmentDetails', {
        templateUrl: '/assets/app/enrolment/exams/examEnrolmentDetails.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['Exam', 'Enrolment', 'DateTime',
            function (Exam, Enrolment, DateTime) {

                var vm = this;

                vm.enrollForExam = function () {
                    Enrolment.checkAndEnroll(vm.exam);
                };

                vm.translateExamType = function () {
                    return Exam.getExamTypeDisplayName(vm.exam.examType.type);
                };

                vm.translateGradeScale = function () {
                    return Exam.getScaleDisplayName(vm.exam.gradeScale || vm.exam.course.gradeScale);
                };

                vm.printExamDuration = function () {
                    return DateTime.printExamDuration(vm.exam);
                };

            }
        ]
    });
