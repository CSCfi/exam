(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$modal', '$routeParams', 'sessionService', 'StudentExamRes', function ($scope, $http, $modal, $routeParams, $sessionService, StudentExamRes) {

            var enrolmentId = $routeParams.enrolment;
            $scope.user = $sessionService.user;

            var formatMoment = function (data) {
                var months = ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu', 'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'];
                var month = data.month();
                $scope.selectedMonth = {
                    display: months[month] + ' ' + data.year(),
                    data: data
                };
            };

            formatMoment(moment());

            var refresh = function () {
                var day = $scope.selectedMonth.data.set('date', 1).format("DD.MM.YYYY");
                $http.get('calendar/' + enrolmentId + '/' + $scope.selectedRoom.id + '/' + day)
                    .then(function (reply) {
                        Object.keys(reply.data).forEach(function (key) {
                            if ($scope.selectedMonth.data.get('month') !==
                                moment(key, 'DD.MM.YYYY').get('month')) {
                                delete reply.data[key];
                            }
                        });

                        $scope.daySlots = reply.data;
                    }, function () {
                        $scope.daySlots = [];
                    });
            };

            $http.get('rooms').then(function (reply) {
                $scope.rooms = reply.data;
                if ($scope.rooms) {
                    $scope.selectRoom(reply.data[0]);
                }
            });

            $scope.formatDate = function (stamp) {
                return moment(stamp, 'DD.MM.YYYY HH:mm').format('DD.MM.');
            };

            $scope.createReservation = function (slot) {

                slot.exam = enrolmentId;

                $http.post('calendar/reservation', slot).then(function (success) {
                    toastr.success(success.data);
                }, function (error) {
                    toastr.error(error.data);
                });
            };

            $scope.formatTime = function (stamp) {
                return moment(stamp, 'DD.MM.YYYY HH:mm').format('HH:mm');
            };

            $scope.nextMonth = function () {
                var date = $scope.selectedMonth.data;
                formatMoment(date.add('months', 1));
                refresh();
            };

            $scope.prevMonth = function () {
                var date = $scope.selectedMonth.data;
                formatMoment(date.subtract('months', 1));
                refresh();
            };

            $scope.selectRoom = function (room) {
                $scope.rooms.forEach(function (room) {
                    delete room.selected;
                });
                room.selected = true;
                $scope.selectedRoom = room;
                $scope.selectedRoomsString = room.name;
                refresh();
            }
        }]);
}());