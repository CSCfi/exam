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

angular.module('app.enrolment').component('activeEnrolment', {
    template: require('./activeEnrolment.template.html'),
    bindings: {
        enrolment: '<',
        onRemoval: '&',
    },
    controller: [
        '$translate',
        '$state',
        'dialogs',
        'Enrolment',
        'Reservation',
        function($translate, $state, dialogs, Enrolment, Reservation) {
            const vm = this;

            vm.removeReservation = function() {
                if (vm.enrolment.reservation) {
                    Reservation.removeReservation(vm.enrolment);
                } else {
                    Enrolment.removeExaminationEvent(vm.enrolment);
                }
            };

            vm.makeReservation = () => {
                if (vm.enrolment.exam.implementation !== 'AQUARIUM') {
                    Enrolment.selectExaminationEvent(vm.enrolment.exam, vm.enrolment);
                } else {
                    vm.goToCalendar();
                }
            };

            vm.hasUpcomingAlternativeEvents = () =>
                vm.enrolment.exam.examinationEventConfigurations.some(
                    eec =>
                        new Date(eec.examinationEvent.start) > new Date() &&
                        (!vm.enrolment.examinationEventConfiguration ||
                            eec.id !== vm.enrolment.examinationEventConfiguration.id),
                );

            vm.removeEnrolment = function() {
                if (vm.enrolment.reservation) {
                    toast.error($translate.instant('sitnet_cancel_reservation_first'));
                } else {
                    dialogs
                        .confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'))
                        .result.then(function() {
                            Enrolment.removeEnrolment(vm.enrolment).then(function() {
                                vm.onRemoval({ data: vm.enrolment });
                            });
                        });
                }
            };

            vm.getNextState = function() {
                return vm.enrolment.collaborativeExam ? 'collaborativeCalendar' : 'calendar';
            };

            vm.getNextStateParams = function() {
                return vm.enrolment.collaborativeExam ? vm.enrolment.collaborativeExam.id : vm.enrolment.exam.id;
            };

            vm.addEnrolmentInformation = function() {
                Enrolment.addEnrolmentInformation(vm.enrolment);
            };

            vm.getRoomInstruction = function() {
                const reservation = vm.enrolment.reservation;
                let o;
                if (reservation.externalReservation) {
                    o = reservation.externalReservation;
                } else if (reservation.machine) {
                    o = reservation.machine.room;
                }
                return o['roomInstruction' + $translate.use().toUpperCase()] || o.roomInstruction;
            };

            vm.goToCalendar = function() {
                $state.go(vm.getNextState(), { id: vm.getNextStateParams() });
            };
        },
    ],
});
