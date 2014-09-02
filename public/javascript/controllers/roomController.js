(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', '$routeParams', 'sessionService', '$location', '$modal', '$http', 'SoftwareResource', 'RoomResource', 'ExamMachineResource', 'SITNET_CONF', 'dateService',
            function ($scope, $routeParams, sessionService, $location, $modal, $http, SoftwareResource, RoomResource, ExamMachineResource, SITNET_CONF, dateService) {

                $scope.dateService = dateService;
                $scope.session = sessionService;

                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/machine.html";
                $scope.addressTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/address.html";
                $scope.hoursTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/open_hours.html";
                $scope.user = $scope.session.user;


                $scope.accessibilities = [];

                $http.get('accessibility').success(function(data){
                    $scope.accessibilities = data;
                });

                var selectable = [],
                    times = [],
                    startHour = 0,
                    endHour = 23,
                    timeStep = '30',
                    rows = 0,
                    days = 7,
                    i,
                    j,
                    k,
                    z,
                    x;

                for (i = startHour; i <= endHour; i++) {
                    times.push(i + ".00");
                    times.push(i + "." + timeStep);
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

                var isAnyExamMachines = function() {
                    if($scope.roomInstance.examMachines === undefined || $scope.roomInstance.examMachines == null || $scope.roomInstance.examMachines.length == 0)
                        return false;
                    else
                        return true;
                };

                var thereIsAnyDefaultTimesAtAll = function(){
                    //todo: optimize!
                    var has = false;
                    selectable.forEach(function (row) {
                        row.forEach(function (cell) {
                            if(cell.type === 'selected') {
                                has = true;
                            }
                        });
                    });
                    return has;
                };

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

                $scope.select = function (e) {

                    if (e.type === '') {
                        e.type = 'accepted';
                    } else if (e.type === 'selected') {
                        clear(e.day);
                        $scope.updateWorkingHours($scope.roomInstance, selectable);
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
                        $scope.updateWorkingHours($scope.roomInstance, selectable);
                    }
                };

                $scope.calculateTime = function (cell) {
                    var hours = cell.time / 2 | 0;
                    var halfHour = cell.time % 2 === 0;
                    var time = startHour + hours;
                    if (halfHour) {
                        time += '.00';
                    } else {
                        time += '.' + timeStep;
                    }
                    return time;
                };

                var setSelected = function (times, day) {
                    var start = times[0];
                    var end = times[times.length - 1];

                    for (var i = start; i <= end; i++) {
                        var cell = selectable[i][day];
                        cell.type = 'selected';
                        cell.day = day;
                        cell.time = i;
                    }
                };

                var resolveDay = function (day) {
                    switch (day) {
                        case "MONDAY":
                            return 0;
                        case "TUESDAY":
                            return 1;
                        case "WEDNESDAY":
                            return 2;
                        case "THURSDAY":
                            return 3;
                        case "FRIDAY":
                            return 4;
                        case "SATURDAY":
                            return 5;
                        case "SUNDAY":
                            return 6;
                    }
                    return -1;
                };

                var slotToTimes = function (slot) {
                    var arr = [];
                    var startKey = moment.utc(slot.startTime).format("H.mm");
                    var endKey = moment.utc(slot.endTime).format("H.mm");
                    var start = times.indexOf(startKey);

                    for (var i = start; i < times.length; i++) {
                        arr.push(i);
                        if (times[i] === endKey) {
                            break;
                        }
                    }
                    return arr;
                };

                if ($scope.user.isAdmin || $scope.user.isTeacher) {
                    if ($routeParams.id === undefined) {
                        $scope.rooms = RoomResource.rooms.query();
                        if($scope.rooms) {
                            angular.forEach($scope.rooms, function(room){
                               if(room.examMachines) {
                                   angular.forEach(room.machines, function(machine, index){
                                       if(machine.isArchived()) {
                                           room.machines.slice(index, 1);
                                       }
                                   });
                               }
                            });
                        }
                    } else {
                        RoomResource.rooms.get({id: $routeParams.id},
                            function (room) {
                                $scope.times = times;

                                room.defaultWorkingHours.forEach(function (slot) {
                                    var s = slotToTimes(slot);
                                    var day = resolveDay(slot.day);
                                    setSelected(s, day);
                                });

                                $scope.table = selectable;

                                $scope.roomInstance = room;

                                if(!isAnyExamMachines())
                                    toastr.error("HUOM! Tenttitilassa ei ole vielä yhtään tenttikonetta.");
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
                };

                $scope.countMachineNotices = function (room) {

                    var i = 0;
                    if (room) {
                        angular.forEach(room.examMachines, function (machine) {
                            !machine.outOfService && machine.statusComment ? ++i : "";
                        });
                    }
                    return i;
                };

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

                    if(!thereIsAnyDefaultTimesAtAll())
                    {
                        toastr.error("Tenttitilalla on oltava vakioaukioloajat." );
                        return;
                    }

                    if(!isAnyExamMachines())
                        toastr.error("Muista lisätä tenttikoneita tilaan "+ $scope.roomInstance.name);

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
                    return machine.softwareInfo.map(function (software) {
                        return software.name;
                    }).join(", ");
                };


                $scope.selectedAccessibilities = function () {
                    return $scope.roomInstance.accessibility.map(function (software) {
                        return software.name;
                    }).join(",");
                };

                $scope.updateAccessibility = function (room) {
                    var ids = room.accessibility.map(function (item) {
                        return item.id;
                    }).join(", ");

                    $http.post('room/' + room.id + '/accessibility', {ids:ids})
                        .success(function () {
                            toastr.info("Huone päivitetty.");
                        });
                };

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

                $scope.updateWorkingHours = function (room, hours) {
                    var h = {};
                    var rows = [];

                    hours.forEach(function (row) {
                        var cells = [];
                        row.forEach(function (cell) {
                            if (cell.type === 'selected') {
                                cells.push(cell);
                            }
                        });
                        if (cells.length > 0) {
                            rows.push(cells);
                        }
                    });

                    h.hours = rows;
                    h.startHour = startHour;
                    h.endHour = endHour;

                    RoomResource.workinghours.update({id: $scope.roomInstance.id}, h,
                        function (workingHours) {
                            toastr.info("Tenttitilan oletusajat päivitetty.");
                            console.log('Updated hours:');
                            console.log(workingHours);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };


                var remove = function (arr, item) {
                    var index = arr.indexOf(item);
                    arr.splice(index, 1);
                };


                $scope.deleteException = function (exception) {
                    RoomResource.exception.remove({id: exception.id},
                        function (saveException) {
                            toastr.info("Tenttitilan poikkeusaika poistettu.");
                            remove($scope.roomInstance.calendarExceptionEvents, exception);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.formatDate = function (exception) {
                    var fmt = 'DD.MM.YYYY';
                    var formatted = moment(exception.startDate).format(fmt);
                    if (exception.endDate) {
                        formatted += ' - ';
                        formatted += moment(exception.endDate).format(fmt);
                    }
                    return formatted;
                };
                $scope.formatTime = function (exception) {
                    var fmt = 'HH.mm';
                    if (!exception.startTime) {
                        return 'poissa käytöstä';
                    }
                    var formatted = moment(exception.startTime).format(fmt);
                    formatted += ' - ';
                    formatted += moment(exception.endTime).format(fmt)
                    return formatted;
                };

                $scope.addException = function () {


                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/admin/exception.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: function ($scope, $modalInstance) {


                            $scope.selectStartDate = function (date) {
                                $scope.startDate = date;
                            };

                            $scope.selectEndDate = function (date) {
                                $scope.endDate = date;
                            };

                            $scope.selectStartTime = function (time) {
                                $scope.startTime = time;
                            };

                            $scope.selectEndTime = function (time) {
                                $scope.endTime = time;
                            };


                            $scope.format = 'dd.MM.yyyy';

                            $scope.endOpen = false;

                            $scope.timeRange = false;
                            $scope.outOfService = false;

                            $scope.startDate = new Date();
                            $scope.endDate = new Date();

                            $scope.startTime = new Date();
                            $scope.startTime.setHours(startHour);
                            $scope.startTime.setMinutes(0);

                            $scope.endTime = new Date();
                            $scope.endTime.setHours(endHour);
                            $scope.endTime.setMinutes(0);


                            $scope.setOutOfService = function (oos) {
                                $scope.outOfService = !oos;
                            };

                            $scope.setRange = function (range) {
                                $scope.timeRange = !range;
                            };

                            $scope.ok = function () {

                                var range = $scope.timeRange;
                                var oos = $scope.outOfService;

                                $modalInstance.close({
                                    "startDate": $scope.startDate,
                                    "endDate": range ? $scope.endDate : undefined,
                                    "startTime": oos ? undefined : $scope.startTime,
                                    "endTime": oos ? undefined : $scope.endTime
                                });
                            };

                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                            };
                        }
                    });

                    modalInstance.result.then(function (exception) {

                        RoomResource.exception.update({id: $scope.roomInstance.id}, exception,
                            function (saveException) {
                                toastr.info("Tenttitilan poikkeusaika lisätty.");
                                exception.id = saveException.id;
                                $scope.roomInstance.calendarExceptionEvents.push(exception);
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    });
                };

                $scope.isArchived = function(machine) {
                      return machine.isArchived() === false;
                };

            }]);
}());