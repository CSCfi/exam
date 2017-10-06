(function () {
    'use strict';
    angular.module('app.enrolment')
        .controller('WaitingRoomCtrl', ['$scope', '$http', '$timeout', '$translate', '$location', 'Session',
            'StudentExamRes', 'waitingRoomService', 'DateTime', 'Enrolment',
            function ($scope, $http, $timeout, $translate, $location, Session, StudentExamRes, waitingRoomService,
                      DateTime, Enrolment) {

                var user = Session.getUser();

                var calculateOffset = function () {
                    var startsAt = moment($scope.enrolment.reservation.startAt);
                    var now = moment();
                    if (now.isDST()) {
                        startsAt.add(-1, 'hour');
                    }
                    return Date.parse(startsAt.format()) - new Date().getTime();
                };

                var setOccasion = function (reservation) {
                    var tz = reservation.machine.room.localTimezone;
                    var start = moment.tz(reservation.startAt, tz);
                    var end = moment.tz(reservation.endAt, tz);
                    if (start.isDST()) {
                        start.add(-1, 'hour');
                    }
                    if (end.isDST()) {
                        end.add(-1, 'hour');
                    }
                    reservation.occasion = {
                        startAt: start.format('HH:mm'),
                        endAt: end.format('HH:mm')
                    };
                };

                var await = function () {
                    if (user && user.isStudent) {
                        var eid = waitingRoomService.getEnrolmentId();
                        StudentExamRes.enrolment.get({eid: eid},
                            function (enrolment) {
                                setOccasion(enrolment.reservation);
                                $scope.enrolment = enrolment;

                                if (!$scope.timeout) {
                                    var offset = calculateOffset();
                                    $scope.timeout = $timeout(function () {
                                        $location.path('/student/exam/' + $scope.enrolment.exam.hash);
                                    }, offset);

                                }

                                // fetch room instructions
                                if (!$scope.info) {
                                    $http.get('/app/enroll/room/' + $scope.enrolment.exam.hash)
                                        .success(function (data) {
                                            $scope.info = data;
                                            $scope.currentLanguageText = currentLanguage();
                                        });
                                }

                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }

                };

                $scope.$on('upcomingExam', function () {
                    if (waitingRoomService.getEnrolmentId() && !$scope.enrolment) {
                        await();
                    }
                });

                $scope.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                $scope.getUsername = function () {
                    return Session.getUserName();
                };

                $scope.showInstructions = function (enrolment) {
                    Enrolment.showInstructions(enrolment);
                };

                // This is just to get page refresh to route us back here
                $http.get('/app/checkSession');

                function currentLanguage() {
                    var tmp = '';

                    if ($scope.info &&
                        $scope.info.reservation &&
                        $scope.info.reservation.machine &&
                        $scope.info.reservation.machine.room) {

                        switch ($translate.use()) {
                            case 'fi':
                                if ($scope.info.reservation.machine.room.roomInstruction) {
                                    tmp = $scope.info.reservation.machine.room.roomInstruction;
                                }
                                break;
                            case 'sv':
                                if ($scope.info.reservation.machine.room.roomInstructionSV) {
                                    tmp = $scope.info.reservation.machine.room.roomInstructionSV;
                                }
                                break;
                            case 'en':
                            /* falls through */
                            default:
                                if ($scope.info.reservation.machine.room.roomInstructionEN) {
                                    tmp = $scope.info.reservation.machine.room.roomInstructionEN;
                                }
                                break;
                        }
                    }
                    return tmp;
                }

            }]);
}());
