(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('RoomCtrl', ['dialogs', '$scope', '$routeParams', 'sessionService', '$location', '$uibModal', '$http',
            'SoftwareResource', 'RoomResource', 'ExamMachineResource', 'EXAM_CONF', 'dateService', '$translate', '$route',
            function (dialogs, $scope, $routeParams, sessionService, $location, $modal, $http, SoftwareResource,
                      RoomResource, ExamMachineResource, EXAM_CONF, dateService, $translate, $route) {

                $scope.dateService = dateService;

                $scope.machineTemplate = EXAM_CONF.TEMPLATES_PATH + "facility/machine.html";
                $scope.addressTemplate = EXAM_CONF.TEMPLATES_PATH + "facility/address.html";
                $scope.hoursTemplate = EXAM_CONF.TEMPLATES_PATH + "facility/open_hours.html";
                $scope.user = sessionService.getUser();
                $scope.examStartingHours = Array.apply(null, new Array(24)).map(function (x, i) {
                    return {startingHour: i + ":00", selected: true};
                });


                $http.get('/app/accessibility').success(function (data) {
                    $scope.accessibilities = data;
                });

                $scope.weekdayNames = dateService.getWeekdayNames();
                $scope.$on('$localeChangeSuccess', function () {
                    $scope.weekdayNames = dateService.getWeekdayNames();
                });

                // initialize the timeslots
                var week = {
                    'MONDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''};
                    }),
                    'TUESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''};
                    }),
                    'WEDNESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''};
                    }),
                    'THURSDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''};
                    }),
                    'FRIDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''};
                    }),
                    'SATURDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''};
                    }),
                    'SUNDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                        return {'index': i, type: ''};
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

                var blocksForDay = function (day) {
                    var blocks = [];
                    var tmp = [];
                    for (var i = 0; i < week[day].length; ++i) {
                        if (week[day][i].type) {
                            tmp.push(i);
                            if (i === week[day].length - 1) {
                                blocks.push(tmp);
                                tmp = [];
                            }
                        } else if (tmp.length > 0) {
                            blocks.push(tmp);
                            tmp = [];
                        }
                    }
                    return blocks;
                };

                $scope.select = function (day, time) {
                    var i = 0, status = week[day][time].type;
                    if (status === 'accepted') { // clear selection
                        week[day][time].type = '';
                        return;
                    }
                    if (status === 'selected') { // mark everything hereafter as free until next block
                        for (i = 0; i < week[day].length; ++i) {
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
                        if (accepted >= 0) { // mark everything between accepted and this as selected
                            if (accepted < time) {
                                for (i = accepted; i <= time; ++i) {
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


                    if ($scope.editingMultipleRooms()) {
                        $scope.roomInstance = $scope.rooms[0];
                    }

                    $scope.updateWorkingHours($scope.roomInstance, week);
                };

                $scope.calculateTime = function (index) {
                    return (times[index] || "0:00") + " - " + times[index + 1];
                };

                var setSelected = function (day, slots) {
                    for (var i = 0; i < slots.length; ++i) {
                        if (week[day][slots[i]]) {
                            week[day][slots[i]].type = 'selected';
                        }
                    }
                };

                var slotToTimes = function (slot) {
                    var arr = [];
                    var startKey = moment(slot.startTime).format("H:mm");
                    var endKey = moment(slot.endTime).format("H:mm");
                    var start = startKey === '0:00' ? 0 : times.indexOf(startKey);
                    for (var i = start; i < times.length; i++) {
                        if (times[i] === endKey) {
                            break;
                        }
                        arr.push(i);
                    }
                    return arr;
                };

                var formatExceptionEvent = function (event) {
                    event.startDate = moment(event.startDate).format();
                    event.endDate = moment(event.endDate).format();
                };

                $scope.editingMultipleRooms = function () {
                    return ($location.path() == '/rooms_edit/edit_multiple');
                };

                $scope.getMassEditedRooms = function () {
                    RoomResource.rooms.query(
                        function (rooms) {
                            $scope.rooms = rooms;
                            $scope.times = times;
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                if ($scope.user.isAdmin) {
                    if (!$routeParams.id) {
                        RoomResource.rooms.query(function (rooms) {
                            $scope.times = times;
                            $scope.rooms = rooms;
                            angular.forEach($scope.rooms, function (room) {
                                room.examMachines = room.examMachines.filter(function (machine) {
                                    return !machine.archived;
                                });
                            });
                        });
                    } else {
                        RoomResource.rooms.get({id: $routeParams.id},
                            function (room) {
                                $scope.times = times;
                                room.defaultWorkingHours.forEach(function (daySlot) {
                                    var timeSlots = slotToTimes(daySlot);
                                    setSelected(daySlot.weekday, timeSlots);
                                });
                                $scope.roomInstance = room;
                                if (!isAnyExamMachines()) {
                                    toastr.warning($translate.instant('sitnet_room_has_no_machines_yet'));
                                }
                                if ($scope.roomInstance.examStartingHours.length > 0) {
                                    var startingHours = $scope.roomInstance.examStartingHours.map(function (hours) {
                                        return moment(hours.startingHour);
                                    });
                                    $scope.roomInstance.examStartingHourOffset = startingHours[0].minute();
                                    startingHours = startingHours.map(function (hours) {
                                        return hours.format("H:mm");
                                    });
                                    $scope.setStartingHourOffset();
                                    $scope.examStartingHours.forEach(function (hours) {
                                        hours.selected = startingHours.indexOf(hours.startingHour) !== -1;
                                    });
                                }
                                $scope.roomInstance.calendarExceptionEvents.forEach(function (event) {
                                    formatExceptionEvent(event);
                                });
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                }
                else {
                    $location.path("/");
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
                    return room.examMachines.filter(function (m) {
                        return m.outOfService;
                    }).length;
                };

                $scope.countMachineNotices = function (room) {
                    if (!room) return 0;
                    return room.examMachines.filter(function (m) {
                        return !m.outOfService && m.statusComment;
                    }).length;
                };

                // Called when create exam button is clicked
                $scope.createExamRoom = function () {
                    RoomResource.draft.get(
                        function (room) {
                            toastr.info($translate.instant("sitnet_room_draft_created"));
                            $location.path("/rooms/" + room.id);
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.manageSoftwares = function () {
                    $location.path("/softwares");
                };

                $scope.editMultipleRooms = function () {
                    $location.path("/rooms_edit/edit_multiple");
                };

                $scope.modifyMachine = function (machine) {
                    $location.path("/machines/" + machine.id);
                };

                $scope.updateRoom = function (room) {
                    RoomResource.rooms.update(room,
                        function () {
                            toastr.info($translate.instant('sitnet_room_updated'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.toggleAllExamStartingHours = function () {
                    var anySelected = $scope.examStartingHours.some(function (hours) {
                        return hours.selected;
                    });
                    $scope.examStartingHours.forEach(function (hours) {
                        hours.selected = !anySelected;
                    });
                };

                function zeropad(n) {
                    n += '';
                    return n.length > 1 ? n : '0' + n;
                }

                $scope.setStartingHourOffset = function () {
                    $scope.roomInstance.examStartingHourOffset = $scope.roomInstance.examStartingHourOffset || 0;
                    $scope.examStartingHours.forEach(function (hours) {
                        hours.startingHour = hours.startingHour.split(':')[0] + ':' + zeropad($scope.roomInstance.examStartingHourOffset);
                    });
                };

                $scope.anyStartingHoursSelected = function () {
                    return $scope.examStartingHours.some(function (hours) {
                        return hours.selected;
                    });
                };

                $scope.updateStartingHours = function () {
                    var selected = $scope.examStartingHours.filter(function (hours) {
                        return hours.selected;
                    }).map(function (hours) {
                        return formatTime(hours.startingHour);
                    });
                    var data = {hours: selected, offset: $scope.roomInstance.examStartingHourOffset};
                    var roomIds;
                    if ($scope.editingMultipleRooms()) {

                        roomIds = $scope.rooms.map(function (s) {
                            return s.id;
                        });
                    } else {
                        roomIds = [$scope.roomInstance.id];
                    }

                    data.roomIds = roomIds;

                    RoomResource.examStartingHours.update(data,
                        function () {
                            toastr.info($translate.instant('sitnet_exam_starting_hours_updated'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.saveRoom = function (room) {

                    if (!isSomethingSelected()) {
                        toastr.error($translate.instant('sitnet_room_must_have_default_opening_hours'));
                        return;
                    }

                    if (!isAnyExamMachines())
                        toastr.error($translate.instant("sitnet_dont_forget_to_add_machines") + " " + $scope.roomInstance.name);

                    RoomResource.rooms.update(room,
                        function () {
                            toastr.info($translate.instant("sitnet_room_saved"));
                            $location.path("/rooms/");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.updateAddress = function (address) {
                    RoomResource.addresses.update(address,
                        function () {
                            toastr.info($translate.instant("sitnet_room_address_updated"));
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
                    if (!$scope.roomInstance) {
                        return;
                    }
                    return $scope.roomInstance.accessibility.map(function (software) {
                        return software.name;
                    }).join(", ");
                };

                $scope.updateAccessibility = function (room) {
                    var ids = room.accessibility.map(function (item) {
                        return item.id;
                    }).join(", ");

                    $http.post('/app/room/' + room.id + '/accessibility', {ids: ids})
                        .success(function () {
                            toastr.info($translate.instant("sitnet_room_updated"));
                        });
                };

                $scope.softwares = SoftwareResource.softwares.query();

                $scope.addNewMachine = function (room) {
                    var newMachine = {};

                    ExamMachineResource.insert({id: room.id}, newMachine, function (machine) {
                        toastr.info($translate.instant("sitnet_machine_added"));
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
                            toastr.info($translate.instant('sitnet_software_updated'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.addSoftware = function (name) {
                    SoftwareResource.add.insert({name: name}, function (software) {
                            toastr.info($translate.instant('sitnet_software_added'));
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
                            toastr.info($translate.instant('sitnet_software_removed'));
                            if ($scope.softwares.indexOf(software) > -1) {
                                $scope.softwares.splice($scope.softwares.indexOf(software), 1);
                            }
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.disableRoom = function (room) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_room_inactivation'));
                    dialog.result.then(function () {
                        RoomResource.rooms.inactivate({id: room.id},
                            function () {
                                toastr.info($translate.instant('sitnet_room_inactivated'));
                                $route.reload();
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    });
                };

                $scope.enableRoom = function (room) {
                    RoomResource.rooms.activate({id: room.id},
                        function () {
                            toastr.info($translate.instant('sitnet_room_activated'));
                            $route.reload();
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                };

                var formatTime = function (time) {
                    var hours = moment().isDST() ? 1 : 0;
                    return moment()
                        .set('hour', parseInt(time.split(':')[0]) + hours)
                        .set('minute', time.split(':')[1])
                        .format("DD.MM.YYYY HH:mmZZ");
                };

                $scope.updateWorkingHours = function (room, week) {
                    var data = {};
                    var workingHours = [];
                    for (var day in week) {
                        if (week.hasOwnProperty(day)) {
                            var blocks = blocksForDay(day);
                            var weekdayBlocks = {'weekday': day, 'blocks': []};
                            for (var i = 0; i < blocks.length; ++i) {
                                var block = blocks[i];
                                var start = formatTime(times[block[0]] || "0:00");
                                var end = formatTime(times[block[block.length - 1] + 1]);
                                weekdayBlocks.blocks.push({'start': start, 'end': end});
                            }
                            workingHours.push(weekdayBlocks);
                        }
                    }
                    data.workingHours = workingHours;
                    var roomIds;
                    if ($scope.editingMultipleRooms()) {
                        roomIds = $scope.rooms.map(function (s) {
                            return s.id;
                        });
                    } else {
                        roomIds = [$scope.roomInstance.id];
                    }
                    data.roomIds = roomIds;
                    RoomResource.workingHours.update(data,
                        function () {
                            toastr.info($translate.instant('sitnet_default_opening_hours_updated'));
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
                        function () {
                            if ($scope.editingMultipleRooms()) {
                                $scope.getMassEditedRooms();
                            } else {
                                remove($scope.roomInstance.calendarExceptionEvents, exception);
                            }
                            toastr.info($translate.instant('sitnet_exception_time_removed'));
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.formatDate = function (exception) {
                    var fmt = 'DD.MM.YYYY HH:mm';
                    var start = moment(exception.startDate);
                    var end = moment(exception.endDate);
                    return start.format(fmt) + ' - ' + end.format(fmt);
                };

                $scope.addException = function () {

                    var modalController = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                        var now = new Date();
                        now.setMinutes(0);
                        now.setSeconds(0);
                        now.setMilliseconds(0);
                        $scope.dateOptions = {
                            'starting-day': 1
                        };
                        $scope.dateFormat = 'dd.MM.yyyy';

                        $scope.exception = {startDate: now, endDate: angular.copy(now), outOfService: true};

                        $scope.ok = function () {

                            var start = moment($scope.exception.startDate);
                            var end = moment($scope.exception.endDate);
                            if (end <= start) {
                                toastr.error($translate.instant('sitnet_endtime_before_starttime'));
                            } else {
                                $modalInstance.close({
                                    "startDate": start,
                                    "endDate": end,
                                    "outOfService": $scope.exception.outOfService
                                });
                            }
                        };

                        $scope.cancel = function () {
                            $modalInstance.dismiss('cancel');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'facility/exception.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController
                    });

                    modalInstance.result.then(function (exception) {

                        var roomIds;
                        if ($scope.editingMultipleRooms()) {
                            roomIds = $scope.rooms.map(function (s) {
                                return s.id;
                            }).join();
                        } else {
                            roomIds = [$scope.roomInstance.id];
                        }

                        RoomResource.exception.update({roomIds: roomIds}, exception,
                            function (data) {
                                toastr.info($translate.instant('sitnet_exception_time_added'));
                                if ($scope.editingMultipleRooms()) {
                                    $scope.getMassEditedRooms();
                                } else {
                                    formatExceptionEvent(data);
                                    $scope.roomInstance.calendarExceptionEvents.push(data);
                                }
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

                $scope.displayAddress = function (address) {

                    if (!address || (!address.street && !address.city && !address.zip)) return "N/A";
                    var street = address.street ? address.street + ", " : "";
                    var city = (address.city || "").toUpperCase();
                    return street + address.zip + " " + city;
                };

                $scope.massEditedRoomFilter = function (room) {
                    return room.calendarExceptionEvents.some(function (e) {
                        return e.massEdited;
                    });
                };

                $scope.massEditedExceptionFilter = function (exception) {
                    return exception.massEdited;
                };

            }]);
}());
