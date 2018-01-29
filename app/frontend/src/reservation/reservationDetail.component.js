/*
 *
 *  * Copyright (c) 2018 Exam Consortium
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */
'use strict';
import angular from 'angular';
import toast from 'toastr';

angular.module('app.reservation')
    .component('reservationDetail', {
        template: require('./reservationDetails.template.html'),
        bindings: {
            reservations: '<',
            isAdminView: '<'
        },
        controller: ['Reservation', 'ExamRes', '$translate',
            function (Reservation, ExamRes, $translate) {
                const vm = this;

                vm.$onInit = function () {
                    vm.isAdminView = vm.isAdminView || false;
                };

                vm.printExamState = function (reservation) {
                    return Reservation.printExamState(reservation);
                };


                vm.getStateclass = function (reservation) {
                    return reservation.noShow ? 'no_show' : reservation.enrolment.exam.state.toLowerCase();
                };

                vm.removeReservation = function (reservation) {
                    Reservation.cancelReservation(reservation).then(function () {
                        vm.reservations.splice(vm.reservations.indexOf(reservation), 1);
                        toast.info($translate.instant('sitnet_reservation_removed'));
                    }).catch(angular.noop);
                };

                vm.permitRetrial = function (reservation) {
                    ExamRes.reservation.update({id: reservation.id}, function () {
                        reservation.retrialPermitted = true;
                        toast.info($translate.instant('sitnet_retrial_permitted'));
                    });
                };

                vm.changeReservationMachine = function (reservation) {
                    Reservation.changeMachine(reservation);
                };
            }]
    });
