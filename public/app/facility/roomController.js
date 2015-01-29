(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', '$routeParams', 'sessionService', '$location', '$modal', '$http', 'SoftwareResource', 'RoomResource', 'ExamMachineResource', 'SITNET_CONF', 'dateService', '$translate',
            function ($scope, $routeParams, sessionService, $location, $modal, $http, SoftwareResource, RoomResource, ExamMachineResource, SITNET_CONF, dateService, $translate) {

                $scope.dateService = dateService;

                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "facility/machine.html";
                $scope.addressTemplate = SITNET_CONF.TEMPLATES_PATH + "facility/address.html";
                $scope.hoursTemplate = SITNET_CONF.TEMPLATES_PATH + "facility/open_hours.html";
                $scope.user = sessionService.getUser();


                $http.get('accessibility').success(function (data) {
                    $scope.accessibilities = data;
                });

                // initialize the timeslots
                var week = {
                    'MONDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''}
                    }),
                    'TUESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''}
                    }),
                    'WEDNESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''}
                    }),
                    'THURSDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''}
                    }),
                    'FRIDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''}
                    }),
                    'SATURDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''}
                    }),
                    'SUNDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''}
                    })
                };

                var times = [""]; // This is a dummy value for setting something for the table header

                for (var i = 0; i <= 24; ++i) {
                    if (i > 0) {
                        times.push(i + ":00");
                    }
                    if (i < 24) {
                        times.push(i + ":30");
                    }
                }

                var isAnyExamMachines = function () {
                    return $scope.roomInstance.examMachines && $scope.roomInstance.examMachines.length > 0;
                };

                var isEmpty = function (day) {
                    for (var i = 0; i < week[day].length; ++i) {
                        if (week[day][i].type !== '') {
                            return false;
                        }
                    }
                    return true;
                };

                var isSomethingSelected = function () {
                    for (var day in week) {
                        if (week.hasOwnProperty(day)) {
                            if (!isEmpty(day)) {
                                return true;
                            }
                        }
                    }
                    return false;
                };

                var firstSelection = function (day) {
                    for (var i = 0; i < week[day].length; ++i) {
                        if (week[day][i].type) {
                            return i;
                        }
                    }
                };

                var lastSelection = function (day) {
                    for (var i = week[day].length - 1; i >= 0; --i) {
                        if (week[day][i].type) {
                            return i;
                        }
                    }
                };

                var blocksForDay = function (day) {
                    var blocks = [];
                    var tmp = [];
                    for (var i = 0; i < week[day].length; ++i) {
                        if (week[day][i].type) {
                            tmp.push(i);
                        } else if (tmp.length > 0) {
                            blocks.push(tmp);
                            tmp = [];
                        }
                    }
                    return blocks;
                };

                $scope.select = function(day, time) {
                    var status = week[day][time].type;
                    if (status === 'accepted') { // clear selection
                        week[day][time].type = '';
                        return;
                    }
                    if (status === 'selected') { // mark everything hereafter as free until next block
                        for (var i = 0; i < week[day].length; ++i) {
                            if (i >= time) {
                                if (week[day][i].type === 'selected') {
                                    week[day][i].type = '';
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        // check if something is accepted yet
                        var accepted;
                        for (i = 0; i < week[day].length; ++i) {
                            if (week[day][i].type === 'accepted') {
                                accepted = i;
                                break;
                            }
                        }
                        if (accepted) { // mark everything between accepted and this as selected
                            if (accepted < time) {
                                for (i= accepted; i <= time; ++i) {
                                    week[day][i].type = 'selected';
                                }
                            } else {
                                for (i = time; i <= accepted; ++i) {
                                    week[day][i].type = 'selected';
                                }
                            }
                        } else {
                            week[day][time].type = 'accepted'; // mark beginning
                            return;
                        }
                    }
                    $scope.updateWorkingHours($scope.roomInstance, week);
                };

                $scope.calculateTime = function (index) {
                    return (times[index] || "0:00") + " - " + times[index + 1];
                };

                var setSelected = function (day, slots) {
                    for (var i = 0; i < slots.length; ++i) {
                        week[day][slots[i]].type = 'selected';
                    }
                };

                var slotToTimes = function (slot) {
                    var arr = [];
                    var startKey = moment(slot.startTime).format("H:mm");
                    var endKey = moment(slot.endTime).format("H:mm");
                    var start = times.indexOf(startKey);
                    for (var i = start; i < times.length; i++) {
                        if (times[i] === endKey) {
                            break;
                        }
                        arr.push(i);
                    }
                    return arr;
                };

                if ($scope.user.isAdmin || $scope.user.isTeacher) {
                    if ($routeParams.id === undefined) {
                        $scope.rooms = RoomResource.rooms.query();
                        if ($scope.rooms) {
                            angular.forEach($scope.rooms, function (room) {
                                if (room.examMachines) {
                                    angular.forEach(room.machines, function (machine, index) {
                                        if (machine.isArchived()) {
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
                                room.defaultWorkingHours.forEach(function (daySlot) {
                                    var timeSlots = slotToTimes(daySlot);
                                    setSelected(daySlot.day, timeSlots);
                                });

                                if (room.calendarExceptionEvents) {
                                    room.calendarExceptionEvents = room.calendarExceptionEvents.map(function (exception) {
                                        var n = new Date().getTimezoneOffset() * 60 * 1000;
                                        exception.startTime += n;
                                        exception.endTime += n;
                                        return exception;
                                    });
                                }

                                $scope.roomInstance = room;

                                if (!isAnyExamMachines())
                                    toastr.error($translate('sitnet_room_has_no_machines_yet'));
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

                $scope.timerange = function () {
                    return Array.apply(null, new Array(times.length - 1)).map(function (x, i) {
                        return i;
                    });
                };

                $scope.getWeekdays = function () {
                    return Object.keys(week);
                };

                $scope.getType = function (day, time) {
                    return week[day][time].type;
                };

                $scope.countMachineAlerts = function (room) {
                    if (!room) return 0;
                    return room.examMachines.filter(function(m) {
                       return m.outOfService;
                    }).length;
                };

                $scope.countMachineNotices = function (room) {
                    if (!room) return 0;
                    return room.examMachines.filter(function(m) {
                        return !m.outOfService && m.statusComment;
                    }).length;
                };

                // Called when create exam button is clicked
                $scope.createExamRoom = function () {
                    RoomResource.draft.get(
                        function (room) {
                            $scope.roomInstance = room;
                            toastr.info($translate("sitnet_room_draft_created"));
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
                        function () {
                            toastr.info($translate('sitnet_room_updated'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.saveRoom = function (room) {

                    if (!isSomethingSelected()) {
                        toastr.error($translate('sitnet_room_must_have_default_opening_hours'));
                        return;
                    }

                    if (!isAnyExamMachines())
                        toastr.error($translate("sitnet_dont_forget_to_add_machines") + " " + $scope.roomInstance.name);

                    RoomResource.rooms.update(room,
                        function (updated_room) {
                            toastr.info($translate("sitnet_room_saved"));
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
                            toastr.info($translate("sitnet_room_address_updated"));
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

                    $http.post('room/' + room.id + '/accessibility', {ids: ids})
                        .success(function () {
                            toastr.info($translate("sitnet_room_updated"));
                        });
                };

                $scope.softwares = SoftwareResource.softwares.query();

                $scope.addNewMachine = function (room) {
                    var newMachine = {
                        "name": $translate("sitnet_write_computer_name")
                    };

                    ExamMachineResource.insert({id: room.id}, newMachine, function (machine) {
                        toastr.info($translate("sitnet_computer_added"));
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
                            toastr.info($translate('sitnet_software_updated'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.addSoftware = function (name) {
                    SoftwareResource.add.insert({name: name}, function (software) {
                            toastr.info($translate('sitnet_software_added'));
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
                            toastr.info($translate('sitnet_software_removed'));
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
                    if (confirm($translate('sitnet_confirm_room_removal'))) {
                        RoomResource.rooms.remove({id: room.id},
                            function () {
                                $scope.rooms.splice($scope.rooms.indexOf(room), 1);
                                toastr.info($translate('sitnet_room_removed'));
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                var formatTime = function(time) {
                    return moment()
                        .set('hour', time.split(':')[0])
                        .set('minute', time.split(':')[1])
                        .format("DD.MM.YYYY HH:mmZZ");
                };

                $scope.updateWorkingHours = function (room, week) {
                    var workingHours = [];
                    for (var day in week) {
                        if (week.hasOwnProperty(day)) {
                            var blocks = blocksForDay(day);
                            var weekdayBlocks = {'weekday': day, 'blocks': []};
                            for (var i = 0; i < blocks.length; ++i) {
                                var block = blocks[i];
                                var start = formatTime(times[block[0]]);
                                var end = formatTime(times[block[block.length - 1] + 1]);
                                weekdayBlocks.blocks.push({'start': start, 'end': end});
                            }
                            workingHours.push(weekdayBlocks);
                        }
                    }

                    RoomResource.workinghours.update({id: $scope.roomInstance.id}, workingHours,
                        function () {
                            toastr.info($translate('sitnet_default_opening_hours_updated'));
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
                            toastr.info($translate('sitnet_exception_time_removed'));
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
                    var fmt = 'HH:mm';
                    if (!exception.startTime) {
                        return $translate('sitnet_out_of_service');
                    }
                    var formatted = moment(exception.startTime).format(fmt);
                    formatted += ' - ';
                    formatted += moment(exception.endTime).format(fmt)
                    return formatted;
                };

                $scope.addException = function () {


                    var modalInstance = $modal.open({
                        templateUrl: SITNET_CONF.TEMPLATES_PATH + 'facility/exception.html',
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
                            $scope.startTime.setHours(0);
                            $scope.startTime.setMinutes(0);

                            $scope.endTime = new Date();
                            $scope.endTime.setHours(23);
                            $scope.endTime.setMinutes(59);


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
                                toastr.info($translate('sitnet_exception_time_added'));
                                exception.id = saveException.id;
                                $scope.roomInstance.calendarExceptionEvents.push(exception);
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    });
                };

                $scope.isArchived = function (machine) {
                    return machine.isArchived() === false;
                };

            }]);
}());