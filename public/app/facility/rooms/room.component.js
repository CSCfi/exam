'use strict';
angular.module('app.facility.rooms')
    .component('room', {
        templateUrl: '/assets/app/facility/rooms/room.template.html',
        controller: ['$translate', '$scope', '$route', '$location', '$uibModal', '$routeParams', '$http',
            'dialogs', 'Room', 'SettingsResource', 'InteroperabilityResource', 'DateTime', 'EXAM_CONF', 'toast',
            function ($translate, $scope, $route, $location, $modal, $routeParams, $http, dialogs, Room, SettingsRes,
                      InteroperabilityRes, DateTime, EXAM_CONF, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.showName = true;
                    vm.editingMultipleRooms = $location.path() === '/rooms_edit/edit_multiple';
                    vm.hoursTemplate = EXAM_CONF.TEMPLATES_PATH + "facility/open_hours.html";
                    vm.addressTemplate = EXAM_CONF.TEMPLATES_PATH + "facility/address.html";
                    vm.showName = true;
                    vm.weekdayNames = DateTime.getWeekdayNames();
                    vm.times = Room.getTimes();
                    vm.week = Room.getWeek();
                    SettingsRes.iop.get(function(data) {
                        vm.isInteroperable = data.isInteroperable;
                    });
                    vm.examStartingHours = Array.apply(null, new Array(24)).map(function (x, i) {
                        return {startingHour: i + ":00", selected: true};
                    });
                    $http.get('/app/accessibility').success(function (data) {
                        vm.accessibilities = data;
                    });

                    Room.rooms.get({id: $routeParams.id},
                        function (room) {
                            room.availableForExternals = room.externalRef !== null;
                            room.defaultWorkingHours.forEach(function (daySlot) {
                                var timeSlots = slotToTimes(daySlot);
                                setSelected(daySlot.weekday, timeSlots);
                            });
                            vm.room = room;
                            if (!Room.isAnyExamMachines(vm.room)) {
                                toast.warning($translate.instant('sitnet_room_has_no_machines_yet'));
                            }
                            if (vm.room.examStartingHours.length > 0) {
                                var startingHours = vm.room.examStartingHours.map(function (hours) {
                                    return moment(hours.startingHour);
                                });
                                vm.room.examStartingHourOffset = startingHours[0].minute();
                                startingHours = startingHours.map(function (hours) {
                                    return hours.format("H:mm");
                                });
                                vm.setStartingHourOffset();
                                vm.examStartingHours.forEach(function (hours) {
                                    hours.selected = startingHours.indexOf(hours.startingHour) !== -1;
                                });
                            }
                            vm.room.calendarExceptionEvents.forEach(function (event) {
                                formatExceptionEvent(event);
                            });
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                $scope.$on('$localeChangeSuccess', function () {
                    vm.weekdayNames = DateTime.getWeekdayNames();
                });

                vm.disableRoom = function () {
                    Room.disableRoom(vm.room);
                };

                vm.enableRoom = function () {
                    Room.enableRoom(vm.room);
                };

                vm.updateRoom = function () {
                    Room.rooms.update(vm.room,
                        function () {
                            toast.info($translate.instant('sitnet_room_updated'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.saveRoom = function () {
                    if (!Room.isSomethingSelected(vm.week)) {
                        toast.error($translate.instant('sitnet_room_must_have_default_opening_hours'));
                        return;
                    }

                    if (!Room.isAnyExamMachines(vm.room))
                        toast.error($translate.instant("sitnet_dont_forget_to_add_machines") + " " + vm.room.name);

                    Room.rooms.update(vm.room,
                        function () {
                            toast.info($translate.instant("sitnet_room_saved"));
                            $location.path("/rooms/");
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.selectedAccessibilities = function () {
                    if (!vm.room) {
                        return;
                    }
                    return vm.room.accessibility.map(function (software) {
                        return software.name;
                    }).join(", ");
                };

                vm.updateInteroperability = function() {
                    InteroperabilityRes.facility.update(vm.room, function(data) {
                        vm.room.externalRef = data.externalRef;
                        vm.room.availableForExternals = data.externalRef !== null;
                    });
                };

                vm.timerange = function () {
                    return Array.apply(null, new Array(vm.times.length - 1)).map(function (x, i) {
                        return i;
                    });
                };

                vm.getWeekdays = function () {
                    return Object.keys(vm.week);
                };

                vm.getType = function (day, time) {
                    return vm.week[day][time].type;
                };

                vm.select = function (day, time) {
                    var i = 0, status = vm.week[day][time].type;
                    if (status === 'accepted') { // clear selection
                        vm.week[day][time].type = '';
                        return;
                    }
                    if (status === 'selected') { // mark everything hereafter as free until next block
                        for (i = 0; i < vm.week[day].length; ++i) {
                            if (i >= time) {
                                if (vm.week[day][i].type === 'selected') {
                                    vm.week[day][i].type = '';
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        // check if something is accepted yet
                        var accepted;
                        for (i = 0; i < vm.week[day].length; ++i) {
                            if (vm.week[day][i].type === 'accepted') {
                                accepted = i;
                                break;
                            }
                        }
                        if (accepted >= 0) { // mark everything between accepted and this as selected
                            if (accepted < time) {
                                for (i = accepted; i <= time; ++i) {
                                    vm.week[day][i].type = 'selected';
                                }
                            } else {
                                for (i = time; i <= accepted; ++i) {
                                    vm.week[day][i].type = 'selected';
                                }
                            }
                        } else {
                            vm.week[day][time].type = 'accepted'; // mark beginning
                        }
                    }
                    if (vm.editingMultipleRooms) {
                        vm.room = vm.rooms[0];
                    }

                    updateWorkingHours();
                };

                vm.calculateTime = function (index) {
                    return (vm.times[index] || "0:00") + " - " + vm.times[index + 1];
                };

                vm.setStartingHourOffset = function () {
                    vm.room.examStartingHourOffset = vm.room.examStartingHourOffset || 0;
                    vm.examStartingHours.forEach(function (hours) {
                        hours.startingHour = hours.startingHour.split(':')[0] + ':' + zeropad(vm.room.examStartingHourOffset);
                    });
                };

                vm.toggleAllExamStartingHours = function () {
                    var anySelected = vm.examStartingHours.some(function (hours) {
                        return hours.selected;
                    });
                    vm.examStartingHours.forEach(function (hours) {
                        hours.selected = !anySelected;
                    });
                };

                vm.updateStartingHours = function () {
                    var selected = vm.examStartingHours.filter(function (hours) {
                        return hours.selected;
                    }).map(function (hours) {
                        return formatTime(hours.startingHour);
                    });
                    var data = {hours: selected, offset: vm.room.examStartingHourOffset};
                    var roomIds;
                    if (vm.editingMultipleRooms) {

                        roomIds = vm.rooms.map(function (s) {
                            return s.id;
                        });
                    } else {
                        roomIds = [vm.room.id];
                    }

                    data.roomIds = roomIds;

                    Room.examStartingHours.update(data,
                        function () {
                            toast.info($translate.instant('sitnet_exam_starting_hours_updated'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.anyStartingHoursSelected = function () {
                    return vm.examStartingHours.some(function (hours) {
                        return hours.selected;
                    });
                };

                vm.addException = function () {

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
                                toast.error($translate.instant('sitnet_endtime_before_starttime'));
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
                        if (vm.editingMultipleRooms) {
                            roomIds = vm.rooms.map(function (s) {
                                return s.id;
                            });
                        } else {
                            roomIds = [vm.room.id];
                        }

                        Room.exceptions.update({roomIds: roomIds, exception: exception},
                            function (data) {
                                toast.info($translate.instant('sitnet_exception_time_added'));
                                if (vm.editingMultipleRooms) {
                                    vm.getMassEditedRooms();
                                } else {
                                    formatExceptionEvent(data);
                                    vm.room.calendarExceptionEvents.push(data);
                                }
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    });
                };

                vm.updateAccessibility = function () {
                    var ids = vm.room.accessibility.map(function (item) {
                        return item.id;
                    }).join(", ");

                    $http.post('/app/room/' + room.id + '/accessibility', {ids: ids})
                        .success(function () {
                            toast.info($translate.instant("sitnet_room_updated"));
                        });
                };

                vm.getMassEditedRooms = function () {
                    Room.rooms.query(
                        function (rooms) {
                            vm.rooms = rooms;
                            vm.times = Room.getTimes();
                        }, function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.massEditedRoomFilter = function (room) {
                    return room.calendarExceptionEvents.some(function (e) {
                        return e.massEdited;
                    });
                };

                vm.massEditedExceptionFilter = function (exception) {
                    return exception.massEdited;
                };

                vm.deleteException = function (exception) {
                    Room.exception.remove({roomId: vm.room.id, exceptionId: exception.id},
                        function () {
                            if (vm.editingMultipleRooms) {
                                vm.getMassEditedRooms();
                            } else {
                                remove(vm.room.calendarExceptionEvents, exception);
                            }
                            toast.info($translate.instant('sitnet_exception_time_removed'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.formatDate = function (exception) {
                    var fmt = 'DD.MM.YYYY HH:mm';
                    var start = moment(exception.startDate);
                    var end = moment(exception.endDate);
                    return start.format(fmt) + ' - ' + end.format(fmt);
                };

                vm.updateAddress = function (address) {
                    Room.addresses.update(address,
                        function () {
                            toast.info($translate.instant("sitnet_room_address_updated"));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                function setSelected(day, slots) {
                    for (var i = 0; i < slots.length; ++i) {
                        if (vm.week[day][slots[i]]) {
                            vm.week[day][slots[i]].type = 'selected';
                        }
                    }
                }

                function slotToTimes(slot) {
                    var arr = [];
                    var startKey = moment(slot.startTime).format("H:mm");
                    var endKey = moment(slot.endTime).format("H:mm");
                    var start = startKey === '0:00' ? 0 : vm.times.indexOf(startKey);
                    for (var i = start; i < vm.times.length; i++) {
                        if (vm.times[i] === endKey) {
                            break;
                        }
                        arr.push(i);
                    }
                    return arr;
                }

                function remove(arr, item) {
                    var index = arr.indexOf(item);
                    arr.splice(index, 1);
                }

                function formatExceptionEvent(event) {
                    event.startDate = moment(event.startDate).format();
                    event.endDate = moment(event.endDate).format();
                }

                function zeropad(n) {
                    n += '';
                    return n.length > 1 ? n : '0' + n;
                }

                function updateWorkingHours() {
                    var data = {};
                    var workingHours = [];
                    for (var day in vm.week) {
                        if (vm.week.hasOwnProperty(day)) {
                            var blocks = blocksForDay(day);
                            var weekdayBlocks = {'weekday': day, 'blocks': []};
                            for (var i = 0; i < blocks.length; ++i) {
                                var block = blocks[i];
                                var start = formatTime(vm.times[block[0]] || "0:00");
                                var end = formatTime(vm.times[block[block.length - 1] + 1]);
                                weekdayBlocks.blocks.push({'start': start, 'end': end});
                            }
                            workingHours.push(weekdayBlocks);
                        }
                    }
                    data.workingHours = workingHours;
                    var roomIds;
                    if (vm.editingMultipleRooms) {
                        roomIds = vm.rooms.map(function (s) {
                            return s.id;
                        });
                    } else {
                        roomIds = [vm.room.id];
                    }
                    data.roomIds = roomIds;
                    Room.workingHours.update(data,
                        function () {
                            toast.info($translate.instant('sitnet_default_opening_hours_updated'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                }

                function blocksForDay(day) {
                    var blocks = [];
                    var tmp = [];
                    for (var i = 0; i < vm.week[day].length; ++i) {
                        if (vm.week[day][i].type) {
                            tmp.push(i);
                            if (i === vm.week[day].length - 1) {
                                blocks.push(tmp);
                                tmp = [];
                            }
                        } else if (tmp.length > 0) {
                            blocks.push(tmp);
                            tmp = [];
                        }
                    }
                    return blocks;
                }

                function formatTime(time) {
                    var hours = moment().isDST() ? 1 : 0;
                    return moment()
                        .set('hour', parseInt(time.split(':')[0]) + hours)
                        .set('minute', time.split(':')[1])
                        .format("DD.MM.YYYY HH:mmZZ");
                }

            }]
    });