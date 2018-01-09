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
angular.module('app.enrolment')
    .component('examSearch', {
        templateUrl: '/assets/app/enrolment/search/examSearch.template.html',
        controller: ['StudentExamRes', 'EnrollRes', 'SettingsResource', 'Language', 'toast',
            function (StudentExamRes, EnrollRes, SettingsResource, Language, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.filter = {};
                    vm.loader = {loading: false};
                    SettingsResource.enrolmentPermissions.get(function (setting) {
                        vm.permissionCheck = setting;
                        if (setting.active === true) {
                            vm.loader.loading = true;
                            search();
                        }
                    });
                };

                vm.search = function () {
                    if (vm.permissionCheck.active === false) {
                        if (vm.filter.text) {
                            vm.loader.loading = true;
                            search();
                        } else {
                            delete vm.exams;
                        }
                    }
                };

                var search = function () {
                    StudentExamRes.exams.query({filter: vm.filter.text}, function (exams) {
                        exams.forEach(function (exam) {
                            if (!exam.examLanguages) {
                                console.warn('No languages for exam #' + exam.id);
                                exam.examLanguages = [];
                            }
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return Language.getLanguageNativeName(lang.code);
                            });

                        });

                        vm.exams = exams;
                        checkEnrolment();
                        vm.loader.loading = false;
                    }, function (err) {
                        vm.loader.loading = false;
                        toast.error(err.data);
                    });

                };

                var checkEnrolment = function () {
                    vm.exams.forEach(function (exam) {
                        EnrollRes.check.get({id: exam.id}, function (enrolments) {
                                // check if student has reserved aquarium
                                enrolments.forEach(function (enrolment) {
                                    if (enrolment.reservation) {
                                        exam.reservationMade = true;
                                    }
                                });

                                // enrolled to exam
                                exam.enrolled = true;
                            }, function (err) {
                                // not enrolled or made reservations
                                exam.enrolled = false;
                                exam.reservationMade = false;
                            }
                        );

                    });

                };


            }
        ]
    });

