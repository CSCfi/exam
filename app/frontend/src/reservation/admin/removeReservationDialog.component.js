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
    .component('removeReservationDialog', {
        template: require('./removeReservationDialog.template.html'),
        bindings: {
            resolve: '<',
            close: '&',
            dismiss: '&'
        },
        controller: ['ReservationResource',
            function (ReservationRes) {
                const vm = this;
                vm.$onInit = function () {
                    vm.message = {};
                };

                vm.ok = function () {
                    vm.reservation = vm.resolve.reservation;
                    ReservationRes.reservation.remove({id: vm.reservation.id, msg: vm.message.text},
                        function () {
                            vm.close({$value: 'Accepted'});
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.cancel = function () {
                    vm.dismiss({$value: 'Dismissed'});
                };

            }]
    });