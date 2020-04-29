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

angular.module('app.examination').component('examination', {
    template: require('./examination.template.html'),
    bindings: {
        isPreview: '<',
        isCollaborative: '<', // Collaborative preview
    },
    controller: [
        '$state',
        '$window',
        '$stateParams',
        '$translate',
        'Examination',
        'Enrolment',
        function($state, $window, $stateParams, $translate, Examination, Enrolment) {
            const vm = this;

            vm.$onInit = function() {
                if (!vm.isPreview) {
                    $window.onbeforeunload = function() {
                        return $translate.instant('sitnet_unsaved_data_may_be_lost');
                    };
                }
                Examination.startExam($stateParams.hash, vm.isPreview, vm.isCollaborative, $stateParams.id).then(
                    function(exam) {
                        exam.examSections.sort(function(a, b) {
                            return a.sequenceNumber - b.sequenceNumber;
                        });
                        // set section indices
                        angular.forEach(exam.examSections, function(section, index) {
                            section.index = index + 1;
                        });

                        vm.exam = exam;
                        setActiveSection({ type: 'guide' });
                        if (!vm.isPreview && !vm.exam.cloned && vm.exam.executionType.type === 'MATURITY') {
                            Enrolment.showMaturityInstructions({ exam: vm.exam });
                        }
                    },
                    function(err) {
                        console.log(JSON.stringify(err));
                        $state.go('dashboard');
                    },
                );
            };

            vm.selectNewPage = function(page) {
                setActiveSection(page);
            };

            vm.timedOut = () =>
                // Save all textual answers regardless of empty or not
                Examination.saveAllTextualAnswersOfExam(vm.exam).then(() => logout('sitnet_exam_time_is_up'));

            const findSection = function(sectionId) {
                const i = vm.exam.examSections
                    .map(function(es) {
                        return es.id;
                    })
                    .indexOf(sectionId);
                if (i >= 0) {
                    return vm.exam.examSections[i];
                }
            };

            const setActiveSection = function(page) {
                if (vm.activeSection) {
                    Examination.saveAllTextualAnswersOfSection(vm.activeSection, vm.exam.hash, true);
                }
                delete vm.activeSection;
                if (page.type === 'section') {
                    vm.activeSection = findSection(page.id);
                }
                $window.scrollTo(0, 0);
            };

            const logout = function(msg) {
                Examination.logout(msg, vm.exam.hash, vm.exam.implementation === 'CLIENT_AUTH');
            };
        },
    ],
});
