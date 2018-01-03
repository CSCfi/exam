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
angular.module('app.enrolment')
    .component('examParticipations', {
        templateUrl: '/assets/app/enrolment/finished/examParticipations.template.html',
        controller: ['$scope', '$translate', 'StudentExamRes', 'toast',
            function ($scope, $translate, StudentExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.filter = {ordering: '-ended', text: null};
                    vm.pageSize = 10;
                    vm.search();
                };

                vm.search = function () {
                    StudentExamRes.finishedExams.query({filter: vm.filter.text},
                        function (data) {
                            data.filter(function (t) {
                                return !t.ended;
                            }).forEach(function (t) {
                                // no-shows, end time to reflect reservations end time
                                t.ended = t.reservation.endAt;
                            });
                            vm.participations = data;
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

            }
        ]
    });




