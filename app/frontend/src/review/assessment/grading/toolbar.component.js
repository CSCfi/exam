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
import angular from 'angular';

angular.module('app.review').component('rToolbar', {
    template: require('./toolbar.template.html'),
    bindings: {
        valid: '<',
    },
    require: {
        parentCtrl: '^^rGrading',
    },
    controller: [
        '$stateParams',
        'Assessment',
        'CollaborativeAssessment',
        'Exam',
        function($stateParams, Assessment, CollaborativeAssessment, Exam) {
            const vm = this;

            vm.$onInit = function() {
                vm.exam = vm.parentCtrl.exam;
                vm.participation = vm.parentCtrl.participation;
            };

            vm.isOwnerOrAdmin = function() {
                return Exam.isOwnerOrAdmin(vm.exam, vm.parentCtrl.collaborative);
            };

            vm.isReadOnly = function() {
                return Assessment.isReadOnly(vm.exam);
            };

            vm.isGraded = function() {
                return Assessment.isGraded(vm.exam);
            };

            vm.isMaturityRejection = function() {
                return (
                    vm.exam.executionType.type === 'MATURITY' &&
                    !vm.exam.subjectToLanguageInspection &&
                    vm.exam.grade &&
                    vm.exam.grade.marksRejection
                );
            };

            vm.saveAssessment = function() {
                if (vm.parentCtrl.collaborative) {
                    CollaborativeAssessment.saveAssessment(
                        vm.participation,
                        vm.isOwnerOrAdmin(),
                        $stateParams.id,
                        $stateParams.ref,
                    );
                } else {
                    Assessment.saveAssessment(vm.exam, vm.isOwnerOrAdmin());
                }
            };

            vm.createExamRecord = function() {
                if (vm.parentCtrl.collaborative) {
                    CollaborativeAssessment.createExamRecord(vm.participation, $stateParams.id, $stateParams.ref);
                } else {
                    Assessment.createExamRecord(vm.exam, true, vm.parentCtrl.collaborative);
                }
            };

            vm.rejectMaturity = function() {
                Assessment.rejectMaturity(vm.exam);
            };

            vm.getExitUrl = function() {
                return Assessment.getExitUrl(vm.exam, vm.parentCtrl.collaborative);
            };
        },
    ],
});
