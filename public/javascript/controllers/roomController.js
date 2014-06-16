(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', '$routeParams', 'sessionService', '$location', 'SoftwareResource', 'RoomResource', 'ExamMachineResource', 'SITNET_CONF', 'dateService',
            function ($scope, $routeParams, sessionService, $location, SoftwareResource, RoomResource, ExamMachineResource, SITNET_CONF, dateService) {

                $scope.dateService = dateService;
                $scope.session = sessionService;

                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/machine.html";
                $scope.addressTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/address.html";
                $scope.user = $scope.session.user;


                if ($scope.user.isAdmin || $scope.user.isTeacher) {
                    if ($routeParams.id === undefined) {
                        $scope.rooms = RoomResource.rooms.query();
                    } else {
                        RoomResource.rooms.get({id: $routeParams.id},
                            function (room) {
                                $scope.roomInstance = room;
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                }
                else
                {
                    $location.path("/home");
                }

                $scope.countMachineAlerts = function (room) {

                    var i = 0;
                    if(room) {
                        angular.forEach(room.examMachines, function (machine) {
                            machine.outOfService ? ++i : "";
                        });
                    }
                    return i;
                }

                $scope.countMachineNotices = function (room) {

                    var i = 0;
                    if(room) {
                        angular.forEach(room.examMachines, function (machine) {
                            !machine.outOfService && machine.statusComment ? ++i : "";
                        });
                    }
                    return i;
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

                $scope.manageSoftwares = function () {
                    $location.path("/softwares");
                };

                $scope.modifyMachine = function (machine) {
                    $location.path("/machines/" + machine.id);
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
                            toastr.info('<i class="fa fa-save"></i>');
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.selectedSoftwares = function(machine) {
                    var softwares = [], str = "";
                    angular.forEach(machine.softwareInfo, function(software, index) {
                            softwares.push(software.name)
                    });
                    for(var i = 0; i < softwares.length; i++) {
                        str += softwares[i]
                        if(i + 1 != softwares.length) {
                            str += ", "
                        }
                    }
                    return str;
                }
                $scope.softwares = SoftwareResource.softwares.query();

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

                $scope.updateMachineSoftware = function (machine) {
                    $scope.updateMachine(machine);
                    $scope.selectedSoftwares(machine);
                };

                $scope.updateSoftware = function (software) {
                    SoftwareResource.update.update({id: software.id}, software,
                        function (updated_software) {
                            software = updated_software;
                            toastr.info("Ohjelmisto päivitetty.");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.addSoftware = function (name) {
                    SoftwareResource.add.insert({name: name}, function (software) {
                            toastr.info("Ohjelmisto lisätty.");
                            $scope.softwares.push(software);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.removeSoftware = function (software) {
                    SoftwareResource.software.remove({id: software.id},
                        function () {
                            toastr.info("Ohjelmisto poistettu.");
                            if($scope.softwares.indexOf(software) > -1) {
                                $scope.softwares.splice($scope.softwares.indexOf(software), 1);
                            }
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                // Tulevaisuudessä tässä pitää olla joku hieno logiikka
                $scope.removeRoom = function (room) {
                    if (confirm('Haluatko poistaa tilan kaikki sen koneet ja varaukset?')) {
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

                $scope.createNewException = function(room) {

                    var newCalendarException = {
                        "exceptionStartDate": $scope.dateService.exceptionStartDateTimestamp,
                        "exceptionEndDate": $scope.dateService.exceptionEndDateTimestamp,
                        "exceptionStartTime": $scope.dateService.exceptionStartTime,
                        "exceptionEndTime": $scope.dateService.exceptionEndTime
                    };

                    RoomResource.exception.update({id: room.id}, newCalendarException,
                        function (exceptionEvent) {
                            toastr.info("Tenttitilan poikkeusaika lisätty.");

                            $scope.roomInstance.calendarExceptionEvents.push(exceptionEvent);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };
        }]);
}());