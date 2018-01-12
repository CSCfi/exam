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
    .component('changeMachineDialog', {
        template: require('./changeMachineDialog.template.html'),
        bindings: {
            resolve: '<',
            close: '&',
            dismiss: '&'
        },
        controller: ['ReservationResource', '$translate',
            function (ReservationRes, $translate) {
                const vm = this;
                vm.$onInit = function () {
                    vm.selection = null;
                    vm.availableMachineOptions = [];
                    vm.reservation = vm.resolve.reservation;
                    ReservationRes.availableMachines.query({id: vm.reservation.id}, function (machines) {
                        machines.forEach(function (machine) {
                            vm.availableMachineOptions.push({
                                id: machine.id,
                                label: machine.name,
                                value: machine
                            })
                        })
                    });
                };

                vm.machineChanged = function (machine) {
                    vm.selection = machine;
                };

                vm.ok = function () {
                    ReservationRes.machine.update({
                        id: vm.reservation.id,
                        machineId: vm.selection.id
                    }, function (machine) {
                        toast.info($translate.instant('sitnet_updated'));
                        vm.close(
                            {
                                $value: {
                                    msg: 'Accepted',
                                    machine: machine
                                }
                            });
                    }, function (msg) {
                        toast.error(msg);
                    });
                };

                vm.cancel = function () {
                    vm.close({$value: 'Dismissed'});
                };

            }]
    });
