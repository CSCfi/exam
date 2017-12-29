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
    .component('activeEnrolment', {
        templateUrl: '/assets/app/enrolment/active/activeEnrolment.template.html',
        bindings: {
            enrolment: '<',
            onRemoval: '&'
        },
        controller: ['$translate', 'dialogs', 'Enrolment', 'Reservation', 'toast',
            function ($translate, dialogs, Enrolment, Reservation, toast) {

                var vm = this;

                vm.removeReservation = function () {
                    Reservation.removeReservation(vm.enrolment);
                };

                vm.removeEnrolment = function () {
                    if (vm.enrolment.reservation) {
                        toast.error($translate.instant('sitnet_cancel_reservation_first'));
                    } else {
                        dialogs.confirm($translate.instant('sitnet_confirm'),
                            $translate.instant('sitnet_are_you_sure')).result.then(
                            function () {
                                Enrolment.removeEnrolment(vm.enrolment).then(function () {
                                        vm.onRemoval({data: vm.enrolment});
                                    }
                                );
                            });
                    }

                };

                vm.addEnrolmentInformation = function () {
                    Enrolment.addEnrolmentInformation(vm.enrolment);
                };

                vm.getRoomInstruction = function () {
                    var reservation = vm.enrolment.reservation;
                    var o;
                    if (reservation.externalReservation) {
                        o = reservation.externalReservation;
                    } else if (reservation.machine){
                        o = reservation.machine.room;
                    }
                    return o['roomInstruction' + $translate.use().toUpperCase()] || o.roomInstruction;
                };

                vm.showMaturityInstructions = function () {
                    Enrolment.showMaturityInstructions(vm.enrolment);
                };

            }
        ]
    });
