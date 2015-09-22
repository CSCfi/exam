(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$location', '$translate', '$modal', '$routeParams', 'sessionService',
            '$locale', 'StudentExamRes', 'dialogs', 'CalendarRes', 'uiCalendarConfig',
            function ($scope, $http, $location, $translate, $modal, $routeParams, sessionService, $locale, StudentExamRes, dialogs, CalendarRes, uiCalendarConfig) {

                $scope.events = [];
                $scope.eventSources = [$scope.events];

                $scope.calendarConfig = {
                    aspectRatio: 3,
                    editable: false,
                    selectable: false,
                    selectHelper: false,
                    defaultView: 'agendaWeek',
                    allDaySlot: false,
                    weekNumbers: true,
                    firstDay: 1,
                    timezone: 'local',
                    timeFormat: 'H:mm',
                    columnFormat: 'ddd D.M',
                    titleFormat: 'D.M.YYYY',
                    slotLabelFormat: 'H:mm',
                    buttonText: {
                        today: $translate.instant('sitnet_today')
                    },
                    minTime: '06:00:00',
                    maxTime: '19:00:00',
                    header: {
                        left: '',
                        center: 'title',
                        right: 'prev, next today'
                    },
                    events: function (start) {
                        refresh(start);
                    },
                    eventClick: function (event) {
                        $scope.createReservation(event.start, event.end);
                    },
                    eventMouseover: function (event, jsEvent, view) {
                        $(this).css('background-color', 'limeGreen');
                        $(this).css('border-color', 'limeGreen');
                        $(this).css('cursor', 'pointer');
                    },
                    eventMouseout: function (event, jsEvent, view) {
                        $(this).css('border-color', 'green');
                        $(this).css('background-color', 'green');
                    },
                    eventRender: function(event, element) {
                        element.attr('title', 'make reservation for ' + event.start.format("HH:mm") + " - " + event.end.format("HH:mm"));
                    }
                };

                var enrolmentId = $routeParams.enrolment;
                $scope.user = sessionService.getUser();

                var formatMoment = function (data) {
                    if (data.locale) {
                        data.locale($locale.id.substring(0, 2));
                    }
                    $scope.selectedMonth = {
                        display: data.format("MMMM YYYY"),
                        data: data
                    };
                };

                $scope.accessibilities = [];

                $http.get('accessibility').success(function (data) {
                    $scope.accessibilities = data;
                });

                var adjust = function (date) {
                    date = moment(date);
                    var offset = date.isDST() ? -1 : 0;
                    return date.add(offset, 'hour').format();
                };

                var refresh = function (start) {
                    var day = start.format("DD.MM.YYYYZZ");
                    var accessibility = $scope.accessibilities.filter(function (item) {
                        return item.selected;
                    }).map(function (item) {
                        return item.id;
                    });
                    if ($scope.selectedRoom) {
                        // hold the reference to event array, can't replace it with []
                        while ($scope.events.length > 0) {
                            $scope.events.pop();
                        }
                        CalendarRes.slots.query({
                                eid: enrolmentId,
                                rid: $scope.selectedRoom.id,
                                day: day,
                                aids: accessibility
                            },
                            function (slots) {
                                slots.forEach(function (slot) {
                                    var event = {
                                        title: 'FREE',
                                        color: 'green',
                                        start: adjust(slot.start),
                                        end: adjust(slot.end)
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
                    if ($scope.rooms) {
                        $scope.selectRoom(reply.data[0]);
                    }
                });

                StudentExamRes.reservationInstructions.get({"id": enrolmentId}, function (result) {
                    $scope.reservationInstructions = result.enrollInstructions;
                });

                $scope.$on('$localeChangeSuccess', function () {
                    $scope.calendarConfig.buttonText.today = $translate.instant('sitnet_today');
                });

                var reserve = function (start, end) {
                    slot.examId = enrolmentId;
                    slot.roomId = $scope.selectedRoom.id;
                    slot.aids = $scope.accessibilities.filter(
                        function (item) {
                            return item.selected;
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
                        + $scope.selectedRoom.name + ".<br/>"
                        + $translate.instant('sitnet_confirm_reservation');
                    dialogs.confirm($translate.instant('sitnet_confirm'), text).result
                        .then(function () {
                            // TODO: check DST stuff
                            reserve(start, end);
                        });
                };

                $scope.selectAccessibility = function (accessibility) {
                    accessibility.selected = !accessibility.selected;
                    uiCalendarConfig.calendars.myCalendar.fullCalendar('refetchEvents');
                };

                $scope.selectRoom = function (room) {
                    $scope.rooms.forEach(function (room) {
                        delete room.selected;
                    });
                    room.selected = true;
                    $scope.selectedRoom = room;

                    if (room.outOfService) {
                        $scope.selectedRoomsString = $translate.instant("sitnet_room_out_of_service") + ": " + room.statusComment;
                    }
                    else {
                        $scope.selectedRoomsString = $translate.instant("sitnet_display_free_time_slots") + ": " + room.name;
                    }
                    uiCalendarConfig.calendars.myCalendar.fullCalendar('refetchEvents');
                }
            }
        ])
    ;
}());
