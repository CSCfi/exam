/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
