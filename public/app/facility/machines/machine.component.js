'use strict';
angular.module('app.facility.machines')
    .component('machine', {
        templateUrl: '/assets/app/facility/machines/machine.template.html',
        controller: ['$q', 'dialogs', '$routeParams', '$location', 'Machines', '$translate',
            function ($q, dialogs, $routeParams, $location, Machines, $translate) {

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
                            toastr.error(error.data);
                        }
                    );
                };

                ctrl.removeMachine = function (machine) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_machine'));
                    dialog.result.then(function () {
                        Machines.machine.remove({id: machine.id},
                            function () {
                                toastr.info($translate.instant('sitnet_machine_removed'));
                                $location.path("/rooms/");
                            },
                            function (error) {
                                toastr.error(error.data);
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
                            toastr.error(error.data);
                        });
                };

                ctrl.updateMachine = function () {
                    var deferred = $q.defer();
                    Machines.machine.update(ctrl.machine,
                        function () {
                            toastr.info($translate.instant('sitnet_machine_updated'));
                            deferred.resolve();
                        },
                        function (error) {
                            toastr.error(error.data);
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

