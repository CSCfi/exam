(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('WaitingRoomCtrl', ['$scope', '$timeout', '$translate', '$location', 'sessionService', 'StudentExamRes', 'waitingRoomService',
            function($scope, $timeout, $translate, $location, sessionService, StudentExamRes, waitingRoomService) {

                $scope.session = sessionService;
                $scope.user = $scope.session.user;

                var calculateOffset = function() {
                    var startsAt = $scope.enrolment.reservation.startAt;
                    // Kinda terrible hack to get the TZ difference right, the backend should provide us
                    // with the timezone, but it does not. It indicates UTC while it actually means EET.
                    //startsAt = startsAt.substring(0, startsAt.length - 1) + "+02:00"; ! this is not working in firefox
                    return (Date.parse(startsAt) + (2 * 60 * 60 * 1000)) - new Date().getTime();
                };

                var await = function() {
                    if ($scope.user && $scope.user.isStudent) {
                        var eid = waitingRoomService.getEnrolmentId();
                        StudentExamRes.enrolment.get({eid: eid},
                            function(enrolment) {
                                $scope.enrolment = enrolment;
                                StudentExamRes.teachers.get({id: enrolment.exam.id},
                                    function(teachers) {
                                        enrolment.teachers = teachers.map(function(teacher) {
                                            return teacher.user.firstName + " " + teacher.user.lastName;
                                        }).join(", ");
                                    },
                                    function(error) {
                                        toastr.error(error.data);
                                    }
                                );
                                if (!$scope.timeout) {
                                    var offset = calculateOffset();
                                    $scope.timeout = $timeout(function() {
                                        $location.path('/student/doexam/' + $scope.enrolment.exam.hash);
                                    }, offset);
                                    toastr.info($translate('sitnet_redirect_to_exam_offset') + " " +
                                        Math.round(offset / 1000 / 60) + " " + $translate('sitnet_minutes') + ". " +
                                        $translate('sitnet_redirect_to_exam_notice') + ".");
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

                    if (exam && exam.duration) {
                        var h = Math.floor(exam.duration / 60);
                        var m = exam.duration % 60;
                        if (h === 0) {
                            return m + "min";
                        } else if (m === 0) {
                            return h + "h ";
                        } else {
                            return h + "h " + m + "min";
                        }
                    } else {
                        return "";
                    }
                };

                $scope.getUsername = function() {
                    return $scope.session.user.firstname + " " + $scope.session.user.lastname;
                };

            }]);
}());