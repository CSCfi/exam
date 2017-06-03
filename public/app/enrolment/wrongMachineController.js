(function() {
    'use strict';
    angular.module('app.enrolment')
        .controller('WrongMachineCtrl', ['$scope', '$rootScope', '$translate', '$http', '$location', 'Session', 'StudentExamRes', 'waitingRoomService', 'dateService',
            function($scope, $rootScope, $translate, $http, $location, Session, StudentExamRes, waitingRoomService, dateService) {

                var user = Session.getUser();

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

                $rootScope.$on('wrongMachine', function() {
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
                    return Session.getUserName();
                };

                // This is just to get page refresh to route us back here
                $http.get('/app/checkSession');

            }]);
}());
