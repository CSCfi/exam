(function() {
    'use strict';
    angular.module("exam.controllers")
        .controller('WaitingRoomCtrl', ['$scope', '$http', '$timeout', '$translate', '$location', 'sessionService',
            'StudentExamRes', 'waitingRoomService', 'dateService', 'enrolmentService',
            function($scope, $http, $timeout, $translate, $location, sessionService, StudentExamRes, waitingRoomService,
                     dateService, enrolmentService) {

                var user = sessionService.getUser();

                var calculateOffset = function() {
                    var startsAt = moment($scope.enrolment.reservation.startAt);
                    var now = moment();
                    if (now.isDST()) {
                        startsAt.add(-1, 'hour');
                    }
                    return Date.parse(startsAt.format()) - new Date().getTime();
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

                var await = function() {
                    if (user && user.isStudent) {
                        var eid = waitingRoomService.getEnrolmentId();
                        StudentExamRes.enrolment.get({eid: eid},
                            function(enrolment) {
                                setOccasion(enrolment.reservation);
                                $scope.enrolment = enrolment;

                                if (!$scope.timeout) {
                                    var offset = calculateOffset();
                                    $scope.timeout = $timeout(function() {
                                        $location.path('/student/doexam/' + $scope.enrolment.exam.hash);
                                    }, offset);
                                    toastr.info($translate.instant('sitnet_redirect_to_exam_offset') + " " +
                                        Math.round(offset / 1000 / 60) + " " + $translate.instant('sitnet_minutes') + ". " +
                                        $translate.instant('sitnet_redirect_to_exam_notice') + ".");
                                }
                            },
                            function(error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                $scope.$on('upcomingExam', function() {
                    if (waitingRoomService.getEnrolmentId() && !$scope.enrolment) {
                        await();
                    }
                });

                $scope.printExamDuration = function(exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.getUsername = function() {
                    return sessionService.getUserName();
                };

                $scope.showInstructions = function(enrolment) {
                    enrolmentService.showInstructions(enrolment);
                };

                // This is just to get page refresh to route us back here
                $http.get('/checkSession');

            }]);
}());
