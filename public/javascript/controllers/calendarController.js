(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$location', '$translate', '$modal', '$routeParams', 'sessionService', '$locale', 'StudentExamRes',
            function($scope, $http, $location, $translate, $modal, $routeParams, $sessionService, $locale, StudentExamRes) {

                var enrolmentId = $routeParams.enrolment;
                $scope.user = $sessionService.user;

                var formatMoment = function(data) {
                    if (data.locale) {
                        data.locale($locale.id.substring(0, 2));
                    }
                    $scope.selectedMonth = {
                        display: data.format("MMMM YYYY"),
                        data: data
                    };
                };

                $scope.accessibilities = [];

                $http.get('accessibility').success(function(data) {
                    $scope.accessibilities = data;
                });

                formatMoment(moment());

                var refresh = function() {
                    var day = $scope.selectedMonth.data.format("DD.MM.YYYYZZ");
                    var accessibility = $scope.accessibilities.filter(function(item) {
                        return item.selected;
                    }).map(function(item) {
                        return item.id;
                    }).join(',');
                    $http.get('calendar/' + enrolmentId + '/' + $scope.selectedRoom.id + '/' + day + '/access/' + accessibility)
                        .then(function(reply) {
                            Object.keys(reply.data).forEach(function(key) {
                                if ($scope.selectedMonth.data.get('month') !==
                                    moment(key, 'DD.MM.YYYY').get('month')) {
                                    delete reply.data[key];
                                }
                            });

                            $scope.daySlots = reply.data;
                        }, function() {
                            $scope.daySlots = [];
                        });
                };

                $http.get('rooms').then(function(reply) {
                    $scope.rooms = reply.data;
                    if ($scope.rooms) {
                        $scope.selectRoom(reply.data[0]);
                    }
                });

                StudentExamRes.reservationInstructions.get({"id": enrolmentId}, function(result) {
                    $scope.reservationInstructions = result.enrollInstructions;
                });

                $scope.formatDate = function(stamp) {
                    return moment(stamp, 'DD.MM.YYYY HH:mm').format('DD.MM.');
                };

                $scope.$on('$localeChangeSuccess', function() {
                    formatMoment($scope.selectedMonth.data);
                });


                $scope.createReservation = function(slot) {

                    slot.exam = enrolmentId;

                    $http.post('calendar/reservation', slot).then(function(success) {
                        $location.path('#/home');
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                $scope.formatTime = function(stamp) {
                    return moment(stamp, 'DD.MM.YYYY HH:mmZZ').format('HH:mm');
                };

                $scope.nextMonth = function() {
                    var date = $scope.selectedMonth.data;
                    formatMoment(date.add('months', 1));
                    refresh();
                };

                $scope.prevMonth = function() {
                    var date = $scope.selectedMonth.data;
                    formatMoment(date.subtract('months', 1));
                    refresh();
                };

                $scope.selectAccessibility = function(accessibility) {
                    accessibility.selected = !accessibility.selected;
                    refresh();
                };

                $scope.selectRoom = function(room) {
                    $scope.rooms.forEach(function(room) {
                        delete room.selected;
                    });
                    room.selected = true;
                    $scope.selectedRoom = room;

                    if (room.outOfService) {
                        $scope.selectedRoomsString = $translate("sitnet_room_out_of_service") + ": " + room.statusComment;
                    }
                    else {
                        $scope.selectedRoomsString = $translate("sitnet_display_free_time_slots") + ": " + room.name;
                    }
                    refresh();
                }
            }]);
}());
