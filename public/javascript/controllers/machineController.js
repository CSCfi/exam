(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('MachineCtrl', ['$scope', '$modal', '$routeParams', '$location', 'SoftwareResource', 'ExamMachineResource', 'EnrollRes', 'SITNET_CONF', 'dateService', '$translate',
            function ($scope, $modal, $routeParams, $location, SoftwareResource, ExamMachineResource, EnrollRes, SITNET_CONF, dateService, $translate) {

                $scope.dateService = dateService;
                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/machine.html";

                ExamMachineResource.get({id: $routeParams.id},
                    function (machine) {
                        $scope.machine = machine;

                        SoftwareResource.softwares.query(
                            function (soft) {
                                $scope.softwares = soft;

                                for(var i = 0; i < $scope.softwares.length; i++ ) {

                                    for(var j = 0; j < $scope.machine.softwareInfo.length; j++ ) {
                                        $scope.softwares[i].class = "btn-default";

                                        if ($scope.machine.softwareInfo[j].id == $scope.softwares[i].id) {
                                            $scope.softwares[i].class = "btn-primary";
                                            break;
                                        }
                                    }
                                }
                            }
                        );
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.getSoftwarePresent = function(software) {

                    for(var i = 0; i < $scope.machine.softwareInfo.length; i++ ) {
                        if ($scope.machine.softwareInfo[i].id == software.id)
                            return "btn-primary";
                    }
                    return "btn-default";
                };


                $scope.removeMachine = function (machine) {
                    if (confirm($translate('sitnet_remove_machine'))) {
                        ExamMachineResource.remove({id: machine.id},
                            function () {
                                $scope.roomInstance.examMachines.splice($scope.roomInstance.examMachines.indexOf(machine), 1);
                                toastr.info($translate('sitnet_machine_removed'));
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                    $location.path("/rooms/");
                };

                $scope.toggleSoftware = function (software) {

                    // make the backend call remove software
                    SoftwareResource.machine.toggle({mid: $scope.machine.id, sid: software.id},
                        function (response) {
                            software.class = (response.software ==='true' ? 'btn-primary' : 'btn-default');
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.updateSoftwareInfo = function () {

                    SoftwareResource.machines.reset({mid: $scope.machine.id},
                        function () {
                            angular.forEach($scope.machine.softwareInfo, function(software) {
                                SoftwareResource.machine.add({mid: $scope.machine.id, sid: software.id});
                            });
                            toastr.info($translate('sitnet_machine_updated'));
                            $scope.selectedSoftwares($scope.machine);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };


                $scope.selectedAccessibilities = function () {
                    return $scope.roomInstance.examMachines.accessibility.map(function (software) {
                        return software.name;
                    }).join(",");
                };

                $scope.updateAccessibility = function (room) {
                    var ids = room.accessibility.examMachines.map(function (item) {
                        return item.id;
                    }).join(", ");

                    $http.post('room/' + room.id + '/accessibility', {ids:ids})
                        .success(function () {
                            toastr.info($translate('sitnet_room_updated'));
                        });
                };


                $scope.updateMachine = function (machine) {

                    ExamMachineResource.update({id: machine.id}, machine,
                        function (updated_machine) {
                            machine = updated_machine;
                            $scope.selectedSoftwares(machine);
                            toastr.info($translate('sitnet_machine_updated'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.updateMachineAndExit = function (machine) {
                    $scope.updateMachine(machine);
                    $location.path("/rooms/");
                };

                $scope.selectedSoftwares = function (machine) {
                    return machine.softwareInfo.map(function (software) {
                        return software.name;
                    }).join(", ");
                };

                $scope.removeMachineModal = function () {

                    var params = {
                        "machine": $scope.machine,
                        "room": $scope.roomInstance
                    };

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/admin/remove_machine_modal.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: "MachineModalController",
                        resolve: {
                            params: function () {
                                return params;
                            }
                        }
                    });

                    modalInstance.result.then(function (machine) {
                        // OK button clicked
                        $scope.removeMachine(machine);
                    }, function () {
                        // Cancel button clicked
                    });
                };
        }]);
}());