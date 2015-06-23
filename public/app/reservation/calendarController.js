(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$location', '$translate', '$modal', '$routeParams', 'sessionService',
            '$locale', 'StudentExamRes', 'dialogs', 'CalendarRes',
            function ($scope, $http, $location, $translate, $modal, $routeParams, sessionService, $locale, StudentExamRes, dialogs, CalendarRes) {

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

                formatMoment(moment());

                var refresh = function () {
                    var day = $scope.selectedMonth.data.format("DD.MM.YYYYZZ");
                    var accessibility = $scope.accessibilities.filter(function (item) {
                        return item.selected;
                    }).map(function (item) {
                        return item.id;
                    });
                    if ($scope.selectedRoom) {
                        CalendarRes.slots.get({
                                eid: enrolmentId,
                                rid: $scope.selectedRoom.id,
                                day: day,
                                aids: accessibility
                            },
                            function (slots) {
                                $scope.daySlots = slots;
                            }, function (error) {
                                if (error && error.status === 404) {
                                    toastr.error($translate.instant('sitnet_exam_not_active_now'));
                                } else {
                                    toastr.error($translate.instant('sitnet_no_suitable_enrolment_found'));
                                }
                                $scope.daySlots = [];
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

                $scope.formatDate = function (stamp, showYear) {
                    var fmt = showYear ? 'DD.MM.YYYY' : 'DD.MM.';
                    return moment(stamp, 'DD.MM.YYYY HH:mm').format(fmt);
                };

                $scope.$on('$localeChangeSuccess', function () {
                    formatMoment($scope.selectedMonth.data);
                });

                var reserve = function (slot) {
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

                $scope.createReservation = function (slot) {
                    var text = $translate.instant('sitnet_about_to_reserve') + "<br/>"
                        + formatDateTime(slot) + " "
                        + $translate.instant('sitnet_at_room') + " "
                        + $scope.selectedRoom.name + ".<br/>"
                        + $translate.instant('sitnet_confirm_reservation');
                    dialogs.confirm($translate.instant('sitnet_confirm'), text).result
                        .then(function () {
                            reserve(slot);
                        });
                };

                var formatDateTime = function (slot) {
                    var start = $scope.formatTime(slot.start);
                    var end = $scope.formatTime(slot.end);
                    var date = $scope.formatDate(slot.start, true);
                    return date + " " + start + " - " + end;
                };

                $scope.formatTime = function (stamp) {
                    var date = moment(stamp, 'DD.MM.YYYY HH:mmZZ');
                    var offset = date.isDST() ? -1 : 0;
                    return date.add(offset, 'hour').format('HH:mm');
                };

                $scope.nextMonth = function () {
                    var date = $scope.selectedMonth.data;
                    formatMoment(date.add(1, 'month'));
                    refresh();
                };

                $scope.prevMonth = function () {
                    var date = $scope.selectedMonth.data;
                    formatMoment(date.subtract(1, 'month'));
                    refresh();
                };

                $scope.selectAccessibility = function (accessibility) {
                    accessibility.selected = !accessibility.selected;
                    refresh();
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
                    refresh();
                }
            }
        ])
    ;
}());
