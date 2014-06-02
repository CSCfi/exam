(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('MachineCtrl', ['$scope', '$routeParams', '$location', 'SoftwareResource', 'ExamMachineResource', 'SITNET_CONF', 'dateService',
            function ($scope, $routeParams, $location, SoftwareResource, ExamMachineResource, SITNET_CONF, dateService) {

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

                $scope.removeMachine = function (machine) {
                    if (confirm('Koneella voi olla varauksia\nPoistetaanko kone?')) {
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
                };

                $scope.updateMachine = function (machine) {
                    ExamMachineResource.update({id: machine.id}, machine,
                        function (updated_machine) {
                            machine = updated_machine;
                            toastr.info("Tenttikone päivitetty.");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };
        }]);
}());