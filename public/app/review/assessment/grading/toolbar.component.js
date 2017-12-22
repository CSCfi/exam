'use strict';

angular.module('app.review')
    .component('rToolbar', {
        templateUrl: '/assets/app/review/assessment/grading/toolbar.template.html',
        bindings: {
            exam: '<',
            valid: '<'
        },
        controller: ['$translate', 'Assessment', 'Exam',
            function ($translate, Assessment, Exam) {

                var vm = this;

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                vm.isMaturityRejection = function () {
                    return vm.exam.executionType.type === 'MATURITY' &&
                        !vm.exam.subjectToLanguageInspection &&
                        vm.exam.grade &&
                        vm.exam.grade.marksRejection;
                };

                vm.saveAssessment = function () {
                    Assessment.saveAssessment(vm.exam, vm.isOwnerOrAdmin());
                };

                vm.createExamRecord = function () {
                    Assessment.createExamRecord(vm.exam, true);
                };

                vm.rejectMaturity = function () {
                    Assessment.rejectMaturity(vm.exam);
                };

                vm.getExitUrl = function () {
                    return Assessment.getExitUrl(vm.exam);
                };

            }

        ]
    });
