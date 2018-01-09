/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
angular.module('app.examination')
    .component('examination', {
        templateUrl: '/assets/app/examination/examination.template.html',
        bindings: {
            isPreview: '<'
        },
        controller: ['$http', '$location', '$routeParams', '$translate', 'Examination',
            function ($http, $location, $routeParams, $translate, Examination) {

                var vm = this;

                vm.$onInit = function () {
                    if (!vm.isPreview) {
                        window.onbeforeunload = function () {
                            return $translate.instant('sitnet_unsaved_data_may_be_lost');
                        };
                    }
                    Examination.startExam($routeParams.hash, vm.isPreview, $routeParams.id)
                        .then(function (exam) {
                            exam.examSections.sort(function (a, b) {
                                return a.sequenceNumber - b.sequenceNumber;
                            });
                            // set section indices
                            angular.forEach(exam.examSections, function (section, index) {
                                section.index = index + 1;
                            });

                            vm.exam = exam;
                            setActiveSection({type: 'guide'});
                        }, function () {
                            $location.path('/');
                        });
                };

                vm.selectNewPage = function (page) {
                    setActiveSection(page);
                };

                vm.timedOut = function () {
                    // Loop through all essay questions in the active section
                    if (vm.activeSection) {
                        Examination.saveAllTextualAnswersOfSection(vm.activeSection, vm.examHash, true).then(function () {
                            logout('sitnet_exam_time_is_up');
                        });
                    } else {
                        logout('sitnet_exam_time_is_up');
                    }
                };

                var findSection = function (sectionId) {
                    var i = vm.exam.examSections.map(function (es) {
                        return es.id;
                    }).indexOf(sectionId);
                    if (i >= 0) {
                        return vm.exam.examSections[i];
                    }
                };

                var setActiveSection = function (page) {
                    delete vm.activeSection;
                    if (page.type === 'section') {
                        vm.activeSection = findSection(page.id);
                    }
                    window.scrollTo(0, 0);
                };

                var logout = function (msg) {
                    Examination.logout(msg, vm.exam.hash);
                };

            }]
    });
