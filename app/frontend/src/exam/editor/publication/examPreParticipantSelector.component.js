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
import toast from 'toastr';

angular.module('app.exam.editor')
    .component('examPreParticipantSelector', {
        template: require('./examPreParticipantSelector.template.html'),
        bindings: {
            exam: '<'
        },
        controller: ['$translate', '$http', 'Enrolment',
            function ($translate, $http, Enrolment) {

                const vm = this;

                vm.$onInit = function () {
                    vm.newPreParticipant = {
                        'email': null
                    };
                };

                vm.addPreParticipant = function () {
                    const exists = vm.exam.examEnrolments.map(function (e) {
                        return e.preEnrolledUserEmail;
                    }).indexOf(vm.newPreParticipant.email) > -1;
                    if (!exists) {
                        Enrolment.enrollStudent(vm.exam, vm.newPreParticipant).then(
                            function (enrolment) {
                                vm.exam.examEnrolments.push(enrolment);
                                delete vm.newPreParticipant.email;
                            }, function (error) {
                                toast.error(error.data);

                            });
                    }
                };

                vm.removeParticipant = function (id) {
                    $http.delete(`/app/enrolments/student/${id}`).then(
                        function () {
                            vm.exam.examEnrolments = vm.exam.examEnrolments.filter(function (ee) {
                                return ee.id !== id;
                            });
                            toast.info($translate.instant('sitnet_participant_removed'));
                        }).catch(err => toast.error(err.data));
                };

                vm.isPreEnrolment = function (enrolment) {
                    return enrolment.preEnrolledUserEmail;
                };

            }]
    });
