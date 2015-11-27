(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$location', '$translate', '$modal', '$routeParams', 'dateService',
            '$locale', 'StudentExamRes', 'dialogs', 'SettingsResource', 'CalendarRes', 'uiCalendarConfig',
            function ($scope, $http, $location, $translate, $modal, $routeParams, dateService, $locale, StudentExamRes,
                      dialogs, SettingsResource, CalendarRes, uiCalendarConfig) {

                $scope.limitations = {};
                $scope.rooms = [];
                $scope.accessibilities = [];
                $scope.openingHours = [];
                $scope.exceptionHours = [];
                $scope.loader = {
                    loading: false
                };
                $scope.eventSources = [];

                StudentExamRes.examInfo.get({eid: $routeParams.id}, function (info) {
                    $scope.examInfo = info;
                    uiCalendarConfig.calendars.myCalendar.fullCalendar('gotoDate', moment.max(moment(),
                        moment($scope.examInfo.examActiveStartDate)));
                });
                SettingsResource.reservationWindow.get(function (setting) {
                    $scope.reservationWindowSize = setting.value;
                    $scope.reservationWindowEndDate = moment().add(setting.value, 'days');
                });

                $scope.showReservationWindowInfo = function () {
                    if ($scope.examInfo && $scope.reservationWindowEndDate) {
                        return moment($scope.examInfo.examActiveEndDate) > $scope.reservationWindowEndDate;
                    }
                    return false;
                };

                $scope.getReservationWindowDescription = function () {
                    return $translate.instant('sitnet_description_reservation_window')
                            .replace('{}', $scope.reservationWindowSize) + ' (' +
                        $scope.reservationWindowEndDate.format('DD.MM.YYYY') + ')';
                };

                var renderCalendarTitle = function () {
                    // Fix date range format in title
                    var selector = $(".fc-toolbar .fc-center > h2");
                    var title = selector.text();
                    var newTitle = '';
                    var separator = ' — ';
                    var endPart = title.split(separator)[1];
                    var startFragments = title.split(separator)[0].split('.').filter(function (x) {
                        // ignore empty fragments (introduced if title already correctly formatted)
                        return x;
                    });
                    if (startFragments.length < 3) {
                        startFragments.forEach(function (f) {
                            newTitle += f;
                            if (f && f[f.length - 1] != '.') {
                                newTitle += '.';
                            }
                        })
                    }
                    newTitle += separator + endPart;
                    selector.text(newTitle);
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

                $scope.selectedAccessibilities = function () {
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

                var refresh = function (start, callback) {
                    var date = start.format();
                    var room = $scope.selectedRoom();
                    var accessibility = $scope.accessibilities.filter(function (item) {
                        return item.filtered;
                    }).map(function (item) {
                        return item.id;
                    });
                    if (room) {
                        $scope.loader.loading = true;
                        CalendarRes.slots.query({
                                eid: $routeParams.id,
                                rid: room.id,
                                day: date,
                                aids: accessibility
                            },
                            function (slots) {
                                var events = slots.map(function (slot) {
                                    return {
                                        title: getTitle(slot),
                                        color: getColor(slot),
                                        start: adjust(slot.start),
                                        end: adjust(slot.end),
                                        availableMachines: slot.availableMachines
                                    };
                                });
                                callback(events);
                                $scope.loader.loading = false;
                            }, function (error) {
                                $scope.loader.loading = false;
                                if (error && error.status === 404) {
                                    toastr.error($translate.instant('sitnet_exam_not_active_now'));
                                } else {
                                    toastr.error($translate.instant('sitnet_no_suitable_enrolment_found'));
                                }
                            });
                        $scope.exceptionHours = getExceptionHours();
                    }
                };

                $http.get('rooms').then(function (reply) {
                    $scope.rooms = reply.data;
                });

                $scope.$on('$localeChangeSuccess', function () {
                    $scope.calendarConfig.buttonText.today = $translate.instant('sitnet_today');
                    $scope.openingHours = processOpeningHours();
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

                // Opening & exception hours display helpers ->

                var getWeekdayNames = function () {
                    var lang = $translate.use();
                    var locale = lang.toLowerCase() + "-" + lang.toUpperCase();
                    var options = {weekday: 'short'};
                    var weekday = dateService.getDateForWeekday;
                    return {
                        SUNDAY: {ord: 7, name: weekday(0).toLocaleDateString(locale, options)},
                        MONDAY: {ord: 1, name: weekday(1).toLocaleDateString(locale, options)},
                        TUESDAY: {ord: 2, name: weekday(2).toLocaleDateString(locale, options)},
                        WEDNESDAY: {ord: 3, name: weekday(3).toLocaleDateString(locale, options)},
                        THURSDAY: {ord: 4, name: weekday(4).toLocaleDateString(locale, options)},
                        FRIDAY: {ord: 5, name: weekday(5).toLocaleDateString(locale, options)},
                        SATURDAY: {ord: 6, name: weekday(6).toLocaleDateString(locale, options)}
                    };
                };

                var findOpeningHours = function (obj, items) {
                    var found = undefined;
                    items.some(function (item) {
                        if (item.ref === obj.weekday) {
                            found = item;
                            return true;
                        }
                    });
                    return found;
                };

                var processOpeningHours = function () {
                    if (!$scope.selectedRoom()) {
                        return;
                    }
                    var weekdayNames = getWeekdayNames();
                    var room = $scope.selectedRoom();
                    var openingHours = [];

                    room.defaultWorkingHours.forEach(function (dwh) {
                        if (!findOpeningHours(dwh, openingHours)) {
                            var obj = {
                                name: weekdayNames[dwh.weekday].name,
                                ref: dwh.weekday,
                                ord: weekdayNames[dwh.weekday].ord,
                                periods: []
                            };
                            openingHours.push(obj);
                        }
                        var hours = findOpeningHours(dwh, openingHours);
                        hours.periods.push(
                            moment(dwh.startTime).format('HH:mm') + " - " +
                            moment(dwh.endTime).format('HH:mm'));
                    });
                    openingHours.forEach(function (oh) {
                        oh.periods = oh.periods.sort().join(', ');
                    });
                    return openingHours.sort(function (a, b) {
                        return a.ord > b.ord;
                    });
                };

                var formatExceptionEvent = function (event) {
                    var startDate = moment(event.startDate);
                    var endDate = moment(event.endDate);
                    var offset = moment().isDST() ? -1 : 0;
                    startDate.add(offset, 'hour');
                    endDate.add(offset, 'hour');
                    event.start = startDate.format('DD.MM.YYYY HH:mm');
                    event.end = endDate.format('DD.MM.YYYY HH:mm');
                    event.description = event.outOfService ? 'sitnet_closed' : 'sitnet_open';
                };

                var getExceptionHours = function () {
                    if (!$scope.selectedRoom()) {
                        return;
                    }
                    var room = $scope.selectedRoom();
                    var start = moment.max(moment(),
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').start);
                    var end = uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').end;
                    var events = room.calendarExceptionEvents.filter(function (e) {
                        return (moment(e.startDate) > start && moment(e.endDate) < end);
                    });
                    events.forEach(formatExceptionEvent);
                    return events;
                };

                var getEarliestOpening = function (room) {
                    var openings = room.defaultWorkingHours.map(function (dwh) {
                        var offset = moment().isDST() ? -1 : 0;
                        var start = moment(dwh.startTime);
                        start.add(offset, 'hour');
                        return start;
                    });
                    return moment.min(openings);
                };

                var getLatestClosing = function (room) {
                    var closings = room.defaultWorkingHours.map(function (dwh) {
                        var offset = moment().isDST() ? -1 : 0;
                        var end = moment(dwh.endTime);
                        end.add(offset, 'hour');
                        return end;
                    });
                    return moment.max(closings);
                };

                var getClosedWeekdays = function (room) {
                    var weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                    var openedDays = room.defaultWorkingHours.map(function (dwh) {
                        return weekdays.indexOf(dwh.weekday);
                    });
                    return [0, 1, 2, 3, 4, 5, 6].filter(function (x) {
                        return openedDays.indexOf(x) === -1
                    });
                };

                // <--

                $scope.selectRoom = function (room) {
                    if (!room.outOfService) {
                        $scope.rooms.forEach(function (room) {
                            delete room.filtered;
                        });
                        room.filtered = true;
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('refetchEvents');
                        $scope.openingHours = processOpeningHours();
                        var minTime = getEarliestOpening(room);
                        var maxTime = getLatestClosing(room);
                        var hiddenDays = getClosedWeekdays(room);
                        var cal = $("#calendar");
                        cal.fullCalendar('destroy');
                        cal.fullCalendar(
                            $.extend($scope.calendarConfig, {
                                minTime: minTime,
                                maxTime: maxTime,
                                scrollTime: minTime,
                                hiddenDays: hiddenDays
                            })
                        );
                    }
                };

                $scope.calendarConfig = {
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
                    header: {
                        left: '',
                        center: 'title',
                        right: 'prev, next today'
                    },
                    events: function (start, end, timezone, callback) {
                        renderCalendarTitle();
                        refresh(start, callback);
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
                    eventRender: function (event, element, view) {
                        if (event.availableMachines > 0) {
                            element.attr('title', $translate.instant('sitnet_new_reservation') + " " +
                                event.start.format("HH:mm") + " - " + event.end.format("HH:mm"));
                        }
                    },
                    eventAfterAllRender: function (view) {
                        // Disable next/prev buttons if date range is off limits
                        var prevButton = $(".fc-prev-button");
                        var nextButton = $(".fc-next-button");
                        var todayButton = $(".fc-today-button");

                        var minDate = !$scope.examInfo ? moment() : moment.max(moment(),
                            moment($scope.examInfo.examActiveStartDate));
                        var maxDate = !$scope.examInfo ? moment() : moment.min($scope.reservationWindowEndDate,
                            moment($scope.examInfo.examActiveEndDate));
                        var today = moment();

                        if (minDate >= view.start && minDate <= view.end) {
                            prevButton.prop('disabled', true);
                            prevButton.addClass('fc-state-disabled');
                        }
                        else {
                            prevButton.removeClass('fc-state-disabled');
                            prevButton.prop('disabled', false);
                        }
                        if (maxDate >= view.start && maxDate <= view.end) {
                            nextButton.prop('disabled', true);
                            nextButton.addClass('fc-state-disabled');
                        } else {
                            nextButton.removeClass('fc-state-disabled');
                            nextButton.prop('disabled', false);
                        }
                        if (today < minDate) {
                            todayButton.prop('disabled', true);
                            todayButton.addClass('fc-state-disabled');
                        } else {
                            todayButton.removeClass('fc-state-disabled');
                            todayButton.prop('disabled', false);
                        }
                    }
                };
            }
        ]);
}());
