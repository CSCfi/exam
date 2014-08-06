(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', '$routeParams', 'sessionService', '$location', '$modal', 'SoftwareResource', 'RoomResource', 'ExamMachineResource', 'SITNET_CONF', 'dateService',
            function ($scope, $routeParams, sessionService, $location, $modal, SoftwareResource, RoomResource, ExamMachineResource, SITNET_CONF, dateService) {

                $scope.dateService = dateService;
                $scope.session = sessionService;

                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/machine.html";
                $scope.addressTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/address.html";
                $scope.hoursTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/open_hours.html";
                $scope.user = $scope.session.user;


                var selectable = [],
                    times = [],
                    startHour = 8,
                    endHour = 16,
                    rows = 0,
                    days = 7,
                    i,
                    j,
                    k,
                    z,
                    x;

                for (i = startHour; i <= endHour; i++) {
                    times.push(i + '.00');
                    times.push(i + '.30');
                    rows += 2;
                }

                for (j = 0; j < rows; j++) {
                    var week = [];
                    for (k = 0; k < days; k++) {
                        week.push(
                            {
                                type: '',
                                day: k,
                                time: j
                            }
                        );
                    }
                    selectable.push(week);
                }

                var clear = function (day) {
                    selectable.forEach(function (row) {
                        row.forEach(function (cell) {
                            if (cell.day === day) {
                                cell.type = '';
                            }
                        });
                    });
                };

                var markRange = function (day, from, to) {
                    if (from > to) {
                        var tmp = to;
                        to = from;
                        from = tmp;
                    }
                    selectable.forEach(function (row) {
                        row.forEach(function (cell) {
                            if (cell.day === day) {
                                if (cell.time >= from && cell.time <= to) {
                                    cell.type = 'selected';
                                }
                            }
                        });
                    });
                };

                var intersection = function (day, newRangeStart, newRangeEnd) {
                    var previouslySelected = [];
                    selectable.forEach(function (row) {
                        row.forEach(function (cell) {
                            if (cell.day === day && cell.type === 'selected') {
                                previouslySelected.push(cell);
                            }
                        });
                    });
                    if (newRangeStart > newRangeEnd) {
                        var tmp = newRangeEnd;
                        newRangeEnd = newRangeStart;
                        newRangeStart = tmp;
                    }

                    for (z = newRangeStart; z <= newRangeEnd; z++) {
                        x = previouslySelected.length;
                        while (x--) {
                            if (previouslySelected[x].time === z) {
                                return true;
                            }
                        }
                    }
                    return false;
                };

                var lineHasSelected = function (day, current) {
                    var has = undefined;
                    selectable.forEach(function (row) {
                        row.forEach(function (cell) {
                            if (cell.day === day &&
                                cell.type === 'accepted' &&
                                cell.time !== current) {

                                has = cell.time;
                            }
                        });
                    });
                    return has;
                };

                $scope.times = times;

                $scope.table = selectable;

                $scope.select = function (e) {

                    if (e.type === '') {
                        e.type = 'accepted';
                    } else if (e.type === 'selected') {
                        clear(e.day);
                        return;
                    } else {
                        e.type = '';
                        return;
                    }

                    var previous = lineHasSelected(e.day, e.time);

                    if (previous !== undefined && previous !== e.time) {
                        if (intersection(e.day, previous, e.time)) {
                            e.type = '';
                            return;
                        }
                        markRange(e.day, previous, e.time);
                    }
                };

                $scope.calculateTime = function (cell) {
                    var hours = cell.time / 2 | 0;
                    var halfHour = cell.time % 2 === 0;
                    var time = startHour + hours;
                    if (halfHour) {
                        time += '.00';
                    } else {
                        time += '.30';
                    }
                    return time;
                };

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
                else {
                    $location.path("/home");
                }

                $scope.countMachineAlerts = function (room) {

                    var i = 0;
                    if (room) {
                        angular.forEach(room.examMachines, function (machine) {
                            machine.outOfService ? ++i : "";
                        });
                    }
                    return i;
                }

                $scope.countMachineNotices = function (room) {

                    var i = 0;
                    if (room) {
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

                $scope.selectedSoftwares = function (machine) {
                    var softwares = [], str = "";
                    angular.forEach(machine.softwareInfo, function (software, index) {
                        softwares.push(software.name)
                    });
                    for (var i = 0; i < softwares.length; i++) {
                        str += softwares[i]
                        if (i + 1 != softwares.length) {
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
                            if ($scope.softwares.indexOf(software) > -1) {
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


                $scope.addException = function () {


                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/admin/exception.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: function ($scope, $modalInstance) {

                            $scope.format = 'dd.MM.yyyy';

                            $scope.startOpen = false;
                            $scope.endOpen = false;

                            $scope.timeRange = false;
                            $scope.outOfService = false;


                            var startDate = new Date();
                            $scope.startDate = startDate;


                            var endDate = new Date();
                            $scope.endDate = endDate;

                            var startTime = new Date();
                            startTime.setHours(8);
                            startTime.setMinutes(0);
                            $scope.startTime = startTime;

                            var endTime = new Date();
                            endTime.setHours(16);
                            endTime.setMinutes(0);
                            $scope.endTime = endTime;


                            $scope.setOutOfService = function(oos){
                                $scope.outOfService = !oos;
                            };

                            $scope.setRange = function(range){
                                $scope.timeRange = !range;
                            };

                            $scope.ok = function () {

                                var range = $scope.timeRange;
                                var oos = $scope.outOfService;
                                $modalInstance.close({
                                    "startDate": startDate,
                                    "endDate": range ? endDate : undefined,
                                    "startTime": oos ? undefined : startTime,
                                    "endTime": oos ? undefined : endTime
                                });
                            };

                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                            };
                        }
                    });

                    modalInstance.result.then(function (exception) {
                        $scope.roomInstance.calendarExceptionEvents.push();

                        RoomResource.exception.update({id: room.id}, exception,
                            function (exceptionEvent) {
                                toastr.info("Tenttitilan poikkeusaika lisätty.");

                                $scope.roomInstance.calendarExceptionEvents.push(exceptionEvent);
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    });
                };

            }]);
}());