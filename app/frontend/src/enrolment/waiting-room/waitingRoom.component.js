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
import moment from 'moment';

angular.module('app.enrolment')
    .component('waitingRoom', {
        template: require('./waitingRoom.template.html'),
        controller: ['$http', '$routeParams', '$timeout', '$translate', '$location', 'StudentExamRes',
            function ($http, $routeParams, $timeout, $translate, $location, StudentExamRes) {

                const vm = this;

                vm.$onInit = function () {
                    if ($routeParams.id) {
                        vm.upcoming = true;
                        StudentExamRes.enrolment.get({eid: $routeParams.id},
                            function (enrolment) {
                                setOccasion(enrolment.reservation);
                                vm.enrolment = enrolment;
                                const offset = calculateOffset();
                                vm.timeout = $timeout(function () {
                                    $location.path('/student/exam/' + vm.enrolment.exam.hash);
                                }, offset);

                                $timeout(() => {
                                    const room = vm.enrolment.reservation.machine.room;
                                    const code = $translate.use().toUpperCase();
                                    vm.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
                                }, 1000);

                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    }
                };

                vm.$onDestroy = function () {
                    if (vm.timeout) {
                        $timeout.cancel(vm.timeout);
                    }
                };

                const calculateOffset = function () {
                    const startsAt = moment(vm.enrolment.reservation.startAt);
                    const now = moment();
                    if (now.isDST()) {
                        startsAt.add(-1, 'hour');
                    }
                    return Date.parse(startsAt.format()) - new Date().getTime();
                };

                const setOccasion = function (reservation) {
                    const tz = reservation.machine.room.localTimezone;
                    const start = moment.tz(reservation.startAt, tz);
                    const end = moment.tz(reservation.endAt, tz);
                    if (start.isDST()) {
                        start.add(-1, 'hour');
                    }
                    if (end.isDST()) {
                        end.add(-1, 'hour');
                    }
                    reservation.occasion = {
                        startAt: start.format('HH:mm'),
                        endAt: end.format('HH:mm')
                    };
                };

            }]
    });
