(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('WaitingRoomCtrl', ['$scope', '$timeout', '$translate', '$location', 'sessionService', 'StudentExamRes', 'waitingRoomService', 'dateService',
            function($scope, $timeout, $translate, $location, sessionService, StudentExamRes, waitingRoomService, dateService) {

                var user = sessionService.getUser();

                var calculateOffset = function() {
                    var startsAt = $scope.enrolment.reservation.startAt;
                    return Date.parse(startsAt) - new Date().getTime(); // CHECK FF!
                };

                var await = function() {
                    if (user && user.isStudent) {
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
                    return dateService.printExamDuration(exam);
                };

                $scope.getUsername = function() {
                    return sessionService.getUserName();
                };

            }]);
}());