(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$location', '$translate', '$modal', '$routeParams', 'dateService',
            '$locale', 'StudentExamRes', 'dialogs', 'CalendarRes', 'uiCalendarConfig',
            function ($scope, $http, $location, $translate, $modal, $routeParams, dateService, $locale, StudentExamRes, dialogs, CalendarRes, uiCalendarConfig) {

                $scope.limitations = {};
                $scope.rooms = [];
                $scope.accessibilities = [];

                $scope.events = [];
                $scope.eventSources = [$scope.events];

                $scope.examInfo = StudentExamRes.examInfo.get({eid: $routeParams.id});

                $scope.calendarConfig = {
                    aspectRatio: 3,
                    editable: false,
                    selectable: false,
                    selectHelper: false,
                    defaultView: 'agendaWeek',
                    allDaySlot: false,
                    weekNumbers: false,
                    firstDay: 1,
                    timezone: 'local',
                    timeFormat: 'H:mm',
                    columnFormat: 'ddd D.M',
                    titleFormat: 'D.M.YYYY',
                    slotLabelFormat: 'H:mm',
                    slotEventOverlap: false,
                    buttonText: {
                        today: $translate.instant('sitnet_today')
                    },
                    minTime: '00:00:00',
                    maxTime: '24:00:00',
                    scrollTime: '08:00:00',
                    header: {
                        left: '',
                        center: 'title',
                        right: 'prev, next today'
                    },
                    events: function (start) {
                        refresh(start);
                    },
                    eventClick: function (event) {
                        if (event.availableMachines > 0) {
                            $scope.createReservation(event.start, event.end);
                        }
                    },
                    eventMouseover: function (event, jsEvent, view) {
                        if (event.availableMachines > 0) {
                            $(this).css('background-color', 'paleGreen');
                            $(this).css('border-color', 'paleGreen');
                            $(this).css('color', '#193F19');
                            $(this).css('cursor', 'pointer');
                        }
                    },
                    eventMouseout: function (event, jsEvent, view) {
                        if (event.availableMachines > 0) {
                            $(this).css('color', 'white');
                            $(this).css('border-color', '#193F19');
                            $(this).css('background-color', '#193F19');
                        }
                    },
                    eventRender: function (event, element) {
                        if (event.availableMachines > 0) {
                            element.attr('title', $translate.instant('sitnet_new_reservation') + " " +
                                event.start.format("HH:mm") + " - " + event.end.format("HH:mm"));
                        }
                    }
                };

                $scope.selectedRoom = function () {
                    var room = undefined;
                    $scope.rooms.some(function (r) {
                        if (r.filtered) {
                            room = r;
                            return true;
                        }
                    });
                    return room;
                };

                $scope.selectedAccessibilites = function () {
                    return $scope.accessibilities.filter(function (a) {
                        return a.filtered;
                    });
                };

                $http.get('accessibility').success(function (data) {
                    $scope.accessibilities = data;
                });

                var adjust = function (date) {
                    date = moment(date);
                    var offset = date.isDST() ? -1 : 0;
                    return date.add(offset, 'hour').format();
                };

                var adjustBack = function (date) {
                    var offset = date.isDST() ? 1 : 0;
                    return moment.utc(date.add(offset, 'hour')).format();
                };

                var getTitle = function (slot) {
                    if (slot.availableMachines > 0) {
                        return $translate.instant('sitnet_slot_available') + ' (' + slot.availableMachines + ')';
                    }
                    if (slot.availableMachines < 0) {
                        return slot.conflictingExam || $translate.instant('sitnet_own_reservation');
                    }
                    return $translate.instant('sitnet_reserved');
                };

                var getColor = function (slot) {
                    if (slot.availableMachines < 0) {
                        return 'orangeRed';
                    }
                    if (slot.availableMachines > 0) {
                        return '#193F19';
                    }
                    return 'grey';
                };

                var refresh = function (start) {
                    var date = start.format();
                    var room = $scope.selectedRoom();
                    var accessibility = $scope.accessibilities.filter(function (item) {
                        return item.filtered;
                    }).map(function (item) {
                        return item.id;
                    });
                    if (room) {
                        // hold the reference to event array, can't replace it with []
                        while ($scope.events.length > 0) {
                            $scope.events.pop();
                        }
                        CalendarRes.slots.query({
                                eid: $routeParams.id,
                                rid: room.id,
                                day: date,
                                aids: accessibility
                            },
                            function (slots) {
                                slots.forEach(function (slot) {
                                    var event = {
                                        title: getTitle(slot),
                                        color: getColor(slot),
                                        start: adjust(slot.start),
                                        end: adjust(slot.end),
                                        availableMachines: slot.availableMachines
                                    };
                                    $scope.events.push(event);
                                });
                            }, function (error) {
                                if (error && error.status === 404) {
                                    toastr.error($translate.instant('sitnet_exam_not_active_now'));
                                } else {
                                    toastr.error($translate.instant('sitnet_no_suitable_enrolment_found'));
                                }
                            });
                    }
                };

                $http.get('rooms').then(function (reply) {
                    $scope.rooms = reply.data;
                });

                $scope.$on('$localeChangeSuccess', function () {
                    $scope.calendarConfig.buttonText.today = $translate.instant('sitnet_today');
                });

                var reserve = function (start, end) {
                    var slot = {};
                    slot.start = adjustBack(start);
                    slot.end = adjustBack(end);
                    slot.examId = $routeParams.id;
                    slot.roomId = $scope.selectedRoom().id;
                    slot.aids = $scope.accessibilities.filter(
                        function (item) {
                            return item.filtered;
                        }).map(function (item) {
                            return item.id;
                        });
                    $http.post('calendar/reservation', slot).then(function () {
                        $location.path('#/home');
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.createReservation = function (start, end) {
                    var text = $translate.instant('sitnet_about_to_reserve') + "<br/>"
                        + start.format("DD.MM.YYYY HH:mm") + " - " + end.format("HH:mm") + " "
                        + $translate.instant('sitnet_at_room') + " "
                        + $scope.selectedRoom().name + ".<br/>"
                        + $translate.instant('sitnet_confirm_reservation');
                    dialogs.confirm($translate.instant('sitnet_confirm'), text).result
                        .then(function () {
                            reserve(start, end);
                        });
                };

                $scope.selectAccessibility = function (accessibility) {
                    accessibility.filtered = !accessibility.filtered;
                    uiCalendarConfig.calendars.myCalendar.fullCalendar('refetchEvents');
                };

                $scope.getDescription = function (room) {
                    if (room.outOfService) {
                        var status = room.statusComment ? ": " + room.statusComment : "";
                        return $translate.instant("sitnet_room_out_of_service") + status;
                    }
                    return room.name;
                };

                $scope.getRoomAccessibility = function () {
                    if (!$scope.selectedRoom()) {
                        return;
                    }
                    return $scope.selectedRoom().accessibility.map(function (a) {
                        return a.name;
                    }).join(', ');
                };

                $scope.getRoomInstructions = function () {
                    if (!$scope.selectedRoom()) {
                        return;
                    }
                    var info;
                    switch ($translate.use()) {
                        case "fi":
                            info = $scope.selectedRoom().roomInstruction;
                            break;
                        case "sv":
                            info = $scope.selectedRoom().roomInstructionSV;
                            break;
                        case "en":
                        default:
                            info = $scope.selectedRoom().roomInstructionEN;
                            break;
                    }
                    return info;
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.selectRoom = function (room) {
                    if (!room.outOfService) {
                        $scope.rooms.forEach(function (room) {
                            delete room.filtered;
                        });
                        room.filtered = true;
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('refetchEvents');
                    }
                }
            }
        ]);
}());
