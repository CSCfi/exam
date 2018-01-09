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
angular.module('app.facility.machines')
    .component('machine', {
        templateUrl: '/assets/app/facility/machines/machine.template.html',
        controller: ['$q', 'dialogs', '$routeParams', '$location', 'Machines', '$translate', 'toast',
            function ($q, dialogs, $routeParams, $location, Machines, $translate, toast) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    Machines.machine.get({id: $routeParams.id},
                        function (machine) {
                            ctrl.machine = machine;
                            Machines.software.query(
                                function (data) {
                                    ctrl.software = data;
                                    ctrl.software.forEach(function (s) {
                                        s.class = ctrl.machine.softwareInfo.map(function (si) {
                                            return si.id;
                                        }).indexOf(s.id) > -1 ? "btn-info" : "btn-default";
                                    });
                                }
                            );
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                ctrl.removeMachine = function (machine) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_machine'));
                    dialog.result.then(function () {
                        Machines.machine.remove({id: machine.id},
                            function () {
                                toast.info($translate.instant('sitnet_machine_removed'));
                                $location.path("/rooms/");
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    });
                };

                ctrl.toggleSoftware = function (software) {
                    Machines.machineSoftware.toggle({mid: ctrl.machine.id, sid: software.id},
                        function (response) {
                            software.class = response.software === 'true' ? 'btn-info' : 'btn-default';
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.updateMachine = function () {
                    var deferred = $q.defer();
                    Machines.machine.update(ctrl.machine,
                        function () {
                            toast.info($translate.instant('sitnet_machine_updated'));
                            deferred.resolve();
                        },
                        function (error) {
                            toast.error(error.data);
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                ctrl.updateMachineAndExit = function () {
                    ctrl.updateMachine(ctrl.machine).then(function () {
                        $location.path("/rooms/");
                    });
                };

            }]
    });

