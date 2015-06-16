(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$location', '$translate', '$modal', '$routeParams', 'sessionService',
            '$locale', 'StudentExamRes', 'dialogs',
            function ($scope, $http, $location, $translate, $modal, $routeParams, sessionService, $locale, StudentExamRes, dialogs) {

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
                    var params = {day: day, aids: accessibility};
                    if ($scope.selectedRoom) {
                        $http.get('calendar/' + enrolmentId + '/' + $scope.selectedRoom.id, {params: params})
                            .then(function (reply) {
                                Object.keys(reply.data).forEach(function (key) {
                                    if ($scope.selectedMonth.data.get('month') !==
                                        moment(key, 'DD.MM.YYYY').get('month')) {
                                        delete reply.data[key];
                                    }
                                });

                                $scope.daySlots = reply.data;
                            }, function (error) {
                                if (error.data && error.data.cause === 'EXAM_NOT_ACTIVE_TODAY') {
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

                $scope.formatDate = function (stamp) {
                    return moment(stamp, 'DD.MM.YYYY HH:mm').format('DD.MM.');
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
                    var text = $translate.instant('sitnet_about_to_reserve') + " "
                        + formatDateTime(slot) + " "
                        + $translate.instant('sitnet_at_room')
                        + $scope.selectedRoom.name + ". "
                        + $translate.instant('sitnet_confirm_reservation');
                    dialogs.confirm($translate.instant('sitnet_confirm'), text).result
                        .then(function () {
                            reserve(slot);
                        });
                };

                var formatDateTime = function (slot) {
                    return $scope.formatDate(slot) + " " + $scope.formatTime(slot);
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
