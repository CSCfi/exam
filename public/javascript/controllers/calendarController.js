(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$modal', 'sessionService', 'ExamRes', function ($scope, $http, $modal, $sessionService, $ExamRes) {

            $scope.user = $sessionService.user;

            $scope.data = [];
            $scope.events = [$scope.data];

            $scope.refreshData = function (start, end, callback) {

                var change = true;
                if(callback) {
                    change = false;
                }
                $scope.data.length = [];
                if (!$scope.room || !$scope.enrollment) {
                    return;
                }
                var room = $scope.room.id;
                var exam = $scope.enrollment.exam.id;
                var day = moment().format("DD.MM.YYYY");
                if(start) {
                    day = moment(start).format("DD.MM.YYYY");
                }
                var xhr = $http.get('calendar/' + exam + '/' + room + '/' + day);
                xhr.success(function (reply) {
                    var firstDate = undefined;
                    angular.forEach(reply, function (item) {
                        var start = moment(item.date, 'DD.MM.YYYY HH:mm').toDate();
                        var end = moment(item.date, 'DD.MM.YYYY HH:mm').toDate();
                        if (!firstDate) {
                            firstDate = start;
                        }
                        $scope.data.push({
                            title: item.slots.length + " aikaa vapaana",
                            start: start,
                            end: end,
                            allDay: true
                        });
                    });
                    if (firstDate && change) {
                        $scope.cal.fullCalendar('gotoDate', firstDate);
                        firstDate = undefined;
                    }
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
            $ExamRes.enrolments.query({uid: $scope.user.id},
                function (enrollments) {
                    $scope.enrollments = enrollments;
                    if (enrollments.length > 0) {
                        $scope.enrollment = enrollments[0];
                    }
                    $scope.refreshData();
                },
                function (error) {
                    toastr.error(error.data);
                }
            );

            $scope.alertEventOnClick = function (date, allDay, jsEvent, view) {
                var modalInstance = $modal.open({
                    templateUrl: 'assets/templates/calendar_reservation.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: "CalendarCtrl",
                    resolve: {
                        slot: function () {
                            return date;
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