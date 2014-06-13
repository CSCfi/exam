(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$modal', '$routeParams', 'sessionService', 'StudentExamRes', function ($scope, $http, $modal, $routeParams, $sessionService, StudentExamRes) {

            $scope.reservationParam = $routeParams.reservation;
            $scope.user = $sessionService.user;

            $scope.data = [];
            $scope.items = [];
            $scope.events = [$scope.data];

            $scope.refreshData = function (start, end, callback) {
                $scope.data.length = 0;

                if (!$scope.room || !$scope.enrollment) {
                    return;
                }
                $scope.checkReservationData(false);


                var room = $scope.room.id;
                var exam = $scope.enrollment.exam.id;
                var day = moment().format("DD.MM.YYYY");
                if (start) {
                    day = moment(start).format("DD.MM.YYYY");
                }
                var xhr = $http.get('calendar/' + exam + '/' + room + '/' + day);
                xhr.success(function (reply) {
                    $scope.items = reply;
                    angular.forEach(reply, function (item) {
                        var start = moment(item.date, 'DD.MM.YYYY HH:mm').toDate();
                        var end = moment(item.date, 'DD.MM.YYYY HH:mm').toDate();
                        $scope.data.push({
                            title: item.slots.length + " aikaa vapaana",
                            start: start,
                            end: end,
                            allDay: false
                        });
                    });
                });
                xhr.error(function (reply) {
                    $scope.reply = reply;
                });
            };


            $scope.checkRooms = function () {
                $http.get('rooms').success(function (reply) {
                    $scope.rooms = reply;
                    if (reply.length > 0) {
                        $scope.room = $scope.rooms[0];
                    }
                    $scope.refreshData();
                });
            };

            $scope.checkReservationData = function (refresh) {
                StudentExamRes.enrolments.query({uid: $scope.user.id},
                    function (enrollments) {
                        if (refresh) {
                            $scope.enrollments = enrollments;
                        }

                        angular.forEach(enrollments, function (roll) {
                            if (refresh && roll.id == $scope.reservationParam) {
                                $scope.enrollment = roll;
                            }
                            if (roll.reservation) {

                                var start = new Date(roll.reservation.startAt);
                                var end = new Date(roll.reservation.endAt);
                                $scope.data.push({
                                    title: roll.reservation.machine.name,
                                    enrollment: roll,
                                    start: start,
                                    end: end,
                                    allDay: false,
                                    className: "reservation"
                                });
                            }

                        });

                        if (refresh && $scope.enrollment == null && enrollments && enrollments.length > 0) {
                            $scope.enrollment = enrollments[0];
                            $scope.refreshData();
                        }

                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );
            };

            $scope.checkRooms();
            $scope.checkReservationData(true);


            $scope.alertEventOnClick = function (date, allDay, jsEvent, view) {
                if (date.className && date.className[0] === 'reservation') {
                    $modal.open({
                        templateUrl: 'assets/templates/calendar_remove.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: function ($scope, $modalInstance, date, room, exam) {

                            $scope.date = date;
                            $scope.exam = exam;
                            $scope.room = room;

                            $scope.getDate = function (enrollment) {
                                if (enrollment && enrollment.enrollment.reservation && enrollment.enrollment.reservation.startAt) {
                                    return  moment(enrollment.enrollment.reservation.startAt).format('DD.MM.YYYY HH:mm') + " - " +
                                        moment(enrollment.enrollment.reservation.endAt).format('DD.MM.YYYY HH:mm');
                                }
                                return "";
                            };

                            $scope.delete = function () {
                                var id = $scope.date.enrollment.reservation.id;
                                $http.delete('calendar/reservation/' + id).success(function (reply) {
                                    $modalInstance.close("removed");
                                });
                            };

                            $scope.cancel = function () {
                                $modalInstance.dismiss('canceled');
                            };
                        },
                        resolve: {
                            date: function () {
                                return date;
                            },
                            room: function () {
                                return $scope.room;
                            },
                            exam: function () {
                                return $scope.enrollment.exam;
                            }

                        }
                    }).result.then(function () {
                            $scope.refreshData();
                        });
                } else {

                    $modal.open({
                        templateUrl: 'assets/templates/calendar_reservation.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: function ($scope, $modalInstance, data, date, room, exam) {

                            var key = moment(date.start).format('DD.MM.YYYY');

                            var times;
                            if (data[key]) {
                                times = data[key].slots;
                                $scope.times = times;
                            }

                            if (times && times.length > 0) {
                                $scope.time = times[0];
                            }
                            $scope.date = key;
                            $scope.exam = exam;
                            $scope.room = room;

                            $scope.optionValue = function (item) {
                                if (!item) {
                                    return;
                                }
                                return item.title + " / " + item.start.split(" ")[1] + " - " + item.end.split(" ")[1];
                            };

                            $scope.save = function () {
                                var data = $scope.time;
                                data.exam = $scope.exam.id;
                                $http.post('calendar/reservation', data).success(function (reply) {

                                    $modalInstance.close("Reserved");
                                });
                            };

                            $scope.cancel = function () {
                                $modalInstance.dismiss('Canceled');
                            };
                            $scope.changeTime = function () {

                            };
                        },
                        resolve: {
                            data: function () {
                                return $scope.items;
                            },
                            date: function () {
                                return date;
                            },
                            room: function () {
                                return $scope.room;
                            },
                            exam: function () {
                                return $scope.enrollment.exam;
                            }

                        }
                    }).result.then(function () {
                            $scope.refreshData();
                        });
                }

            };

            $scope.uiConfig = {
                calendar: {
                    dayNames: ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai", "Sunnuntai"],
                    dayNamesShort: ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"],
                    monthNames: ["Tammikuu", "Helmiikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"],
                    monthNamesShort: ["Tammikuu", "Helmiikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"],
                    editable: false,
                    header: {
                        left: '',
                        center: 'title',
                        right: 'today prev,next'
                    },
                    timeFormat: '',
                    eventClick: $scope.alertEventOnClick,
                    eventDrop: $scope.alertOnDrop,
                    eventResize: $scope.alertOnResize,
                    eventSources: [
                        {
                            events: $scope.refreshData
                        }
                    ]
                }
            };
        }]);
}());