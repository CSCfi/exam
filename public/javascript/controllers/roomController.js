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
                            toastr.info("Tenttitilan huone päivitettiin.");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.saveRoom = function (room) {
                    RoomResource.rooms.update(room,
                        function (updated_room) {
                            toastr.info("Tenttitila talletettiin.");
                            $location.path("/rooms/");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.updateAddress = function (address) {
                    RoomResource.addresses.update(address,
                        function (updated_address) {
                            toastr.info("Tenttitilan osoite päivitettiin");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.updateMachine = function (machine) {
                    ExamMachineResource.update(machine,
                        function (updated_machine) {
                            toastr.info("Tenttitilan kone päivitettiin.");
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

                    ExamMachineResource.insert(room, newMachine, function (machine) {
                        toastr.info("Tentti tallennettu.");
                        room.examMachines.push(machine);
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };
        }]);
}());