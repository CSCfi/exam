(function() {
    'use strict';
    angular.module("exam.controllers")
        .controller('WrongMachineCtrl', ['$scope', '$translate', '$http', '$location', 'sessionService', 'StudentExamRes', 'waitingRoomService', 'dateService',
            function($scope, $translate, $http, $location, sessionService, StudentExamRes, waitingRoomService, dateService) {

                var user = sessionService.getUser();

                var proceed = function() {
                    if (user && user.isStudent) {
                        var eid = waitingRoomService.getEnrolmentId();
                        StudentExamRes.enrolment.get({eid: eid},
                            function(enrolment) {
                                setOccasion(enrolment.reservation);
                                $scope.enrolment = enrolment;
                            },
                            function(error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                var setOccasion = function(reservation) {
                    var tz = reservation.machine.room.localTimezone;
                    var start = moment.tz(reservation.startAt, tz);
                    var end = moment.tz(reservation.endAt, tz);
                    if (start.isDST()) {
                        start.add(-1, 'hour');
                    }
                    if (end.isDST())
                    {
                        end.add(-1, 'hour');
                    }
                    reservation.occasion = {
                        startAt: start.format("HH:mm"),
                        endAt: end.format("HH:mm")
                    };
                };

                $scope.$on('wrongMachine', function() {
                    if (!$scope.enrolment && waitingRoomService.getEnrolmentId()) {
                        $scope.currentRoom = waitingRoomService.getActualRoom();
                        $scope.currentMachine = waitingRoomService.getActualMachine();
                        proceed();
                    }
                });

                $scope.printExamDuration = function(exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.getUsername = function() {
                    return sessionService.getUserName();
                };

                // This is just to get page refresh to route us back here
                $http.get('/checkSession');

            }]);
}());
