(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', '$routeParams', '$location', 'RoomResource', 'ExamMachineResource', 'SITNET_CONF',
            function ($scope, $routeParams, $location, RoomResource, ExamMachineResource, SITNET_CONF) {

                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/machine.html";
                $scope.addressTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/address.html";


                if ($routeParams.id === undefined)
                    $scope.rooms = RoomResource.rooms.query();
                else {
                    RoomResource.rooms.get({id: $routeParams.id},
                        function (room) {
                            $scope.roomInstance = room;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

                // Called when create exam button is clicked
                $scope.createExamRoom = function () {
                    RoomResource.draft.get(
                        function (room) {
                            $scope.roomInstance = room;
                            toastr.info("Tenttitilan luonnos tehty.");
                            $location.path("/rooms/" + room.id);
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };


                $scope.updateRoom = function (room) {
                    RoomResource.rooms.update(room,
                        function (updated_room) {
                            toastr.info("Tenttitila päivitetty.");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.saveRoom = function (room) {
                    RoomResource.rooms.update(room,
                        function (updated_room) {
                            toastr.info("Tenttitila tallennettu.");
                            $location.path("/rooms/");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.updateAddress = function (address) {
//                    RoomResource.addresses.update({id: address}, address,
                    RoomResource.addresses.update(address,
                        function (updated_address) {
                            toastr.info("Tenttitilan osoite päivitetty");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
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

                $scope.addNewMachine = function (room) {
                    var newMachine = {
                        "name": "Kirjoita koneen nimi tähän"
                    };

                    ExamMachineResource.insert({id: room.id}, newMachine, function (machine) {
                        toastr.info("Tenttikone lisätty.");
                        room.examMachines.push(machine);
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

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

                $scope.removeRoom = function (room) {
                    if (confirm('Haluatko poistaa tilan kaikki sen koneet ja varaukset?\nTulevaisuudessä tässä pitää olla joku hieno logiikka')) {
                        RoomResource.rooms.remove({id: room.id},
                            function () {
                                $scope.rooms.splice($scope.rooms.indexOf(room), 1);
                                toastr.info("Tenttitila poistettu");
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };
        }]);
}());