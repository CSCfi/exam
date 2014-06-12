(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$modal', '$routeParams', 'sessionService', 'StudentExamRes', function ($scope, $http, $modal, $routeParams, $sessionService, StudentExamRes) {

            $scope.reservationParam =  $routeParams.reservation;
            $scope.user = $sessionService.user;

            $scope.data = [];
            $scope.items = [];
            $scope.events = [$scope.data];

            $scope.refreshData = function (start, end, callback) {
                $scope.data.length = 0;
                if (!$scope.room || !$scope.enrollment) {
                    return;
                }
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
                            allDay: true
                        });
                    });
                });
                xhr.error(function (reply) {
                    $scope.reply = reply;
                });
            };

            $http.get('rooms').success(function (reply) {
                $scope.rooms = reply;
                if (reply.length > 0) {
                    $scope.room = $scope.rooms[0];
                }
                $scope.refreshData();
            });

            StudentExamRes.enrolments.query({uid: $scope.user.id},
                function (enrollments) {
                    $scope.enrollments = enrollments;

                    angular.forEach(enrollments, function (roll) {
                        if(roll.id == $scope.reservationParam) {
                            $scope.enrollment = roll;
                        }
                    });

                    if($scope.enrollment == null && enrollments && enrollments.length>0) {
                        $scope.enrollment = enrollments[0];
                    }

                    $scope.refreshData();
                },
                function (error) {
                    toastr.error(error.data);
                }
            );

            $scope.alertEventOnClick = function (date, allDay, jsEvent, view) {
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
                                console.log(reply);

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
                });

            };

            $scope.uiConfig = {
                calendar: {
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