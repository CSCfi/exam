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
    .component('waitingRoom', {
        templateUrl: '/assets/app/enrolment/waiting-room/waitingRoom.template.html',
        controller: ['$http', '$routeParams', '$timeout', '$translate', '$location', 'StudentExamRes', 'toast',
            function ($http, $routeParams, $timeout, $translate, $location, StudentExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    if ($routeParams.id) {
                        vm.upcoming = true;
                        StudentExamRes.enrolment.get({eid: $routeParams.id},
                            function (enrolment) {
                                setOccasion(enrolment.reservation);
                                vm.enrolment = enrolment;
                                var offset = calculateOffset();
                                vm.timeout = $timeout(function () {
                                    $location.path('/student/exam/' + vm.enrolment.exam.hash);
                                }, offset);

                                var room = vm.enrolment.reservation.machine.room;
                                var code = $translate.use().toUpperCase();
                                vm.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
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

                var calculateOffset = function () {
                    var startsAt = moment(vm.enrolment.reservation.startAt);
                    var now = moment();
                    if (now.isDST()) {
                        startsAt.add(-1, 'hour');
                    }
                    return Date.parse(startsAt.format()) - new Date().getTime();
                };

                var setOccasion = function (reservation) {
                    var tz = reservation.machine.room.localTimezone;
                    var start = moment.tz(reservation.startAt, tz);
                    var end = moment.tz(reservation.endAt, tz);
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
