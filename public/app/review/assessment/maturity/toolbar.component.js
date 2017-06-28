'use strict';

angular.module('app.review')
    .component('rMaturityToolbar', {
        templateUrl: '/assets/app/review/assessment/maturity/toolbar.template.html',
        bindings: {
            exam: '<',
            valid: '<'
        },
        controller: ['$translate', 'Maturity', 'Assessment', 'Session', 'examService',
            function ($translate, Maturity, Assessment, Session, examService) {

                var vm = this;

                vm.isOwnerOrAdmin = function () {
                    return examService.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isUnderLanguageInspection = function () {
                    return Session.getUser().isLanguageInspector &&
                        vm.exam.languageInspection &&
                        !vm.exam.languageInspection.finishedAt;
                };

                vm.saveAssessment = function () {
                    Assessment.saveAssessment(vm.exam, vm.isOwnerOrAdmin());
                };

                vm.getNextState = function () {
                    return Maturity.getNextState(vm.exam);
                };

                vm.proceed = function (alternate) {
                    Maturity.proceed(vm.exam, alternate);
                };

                vm.isMissingStatement = function () {
                    return Maturity.isMissingStatement(vm.exam);
                };

            }

        ]
    });
