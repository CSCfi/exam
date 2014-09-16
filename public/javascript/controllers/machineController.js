(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('MachineCtrl', ['$scope', '$modal', '$routeParams', '$location', 'SoftwareResource', 'ExamMachineResource', 'EnrollRes', 'SITNET_CONF', 'dateService',
            function ($scope, $modal, $routeParams, $location, SoftwareResource, ExamMachineResource, EnrollRes, SITNET_CONF, dateService) {

                $scope.dateService = dateService;
                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/machine.html";

                ExamMachineResource.get({id: $routeParams.id},
                    function (machine) {
                        $scope.machine = machine;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );
                $scope.softwares = SoftwareResource.softwares.query();

                $scope.removeMachine = function (machine) {
                    if (confirm('Poistetaanko kone?')) {
                        ExamMachineResource.remove({id: machine.id},
                            function () {
                                $scope.roomInstance.examMachines.splice($scope.roomInstance.examMachines.indexOf(machine), 1);
                                toastr.info("Tenttikone poistettu");
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                    $location.path("/rooms/");
                };

                $scope.updateSoftwareInfo = function () {

                    SoftwareResource.machines.reset({mid: $scope.machine.id});

                    angular.forEach($scope.machine.softwareInfo, function(software) {
                        SoftwareResource.machine.add({mid: $scope.machine.id, sid: software.id});
                    });
                    toastr.info("Tenttikone päivitetty.");
                    $scope.selectedSoftwares($scope.machine);
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
                            toastr.info("Huone päivitetty.");
                        });
                };


                $scope.updateMachine = function (machine) {

                    ExamMachineResource.update({id: machine.id}, machine,
                        function (updated_machine) {
                            machine = updated_machine;
                            $scope.selectedSoftwares(machine);
                            toastr.info("Tenttikone päivitetty.");
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