(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('WaitingRoomCtrl', ['$scope', '$http', '$timeout', '$translate', '$location', 'sessionService', 'StudentExamRes', 'waitingRoomService', 'dateService',
            function($scope, $http, $timeout, $translate, $location, sessionService, StudentExamRes, waitingRoomService, dateService) {

                var user = sessionService.getUser();

                var calculateOffset = function() {
                    var startsAt = moment($scope.enrolment.reservation.startAt);
                    var now = moment();
                    if (now.isDST()) {
                        startsAt.add(-1, 'hour');
                    }
                    return Date.parse(startsAt.format()) - new Date().getTime();
                };

                var await = function() {
                    if (user && user.isStudent) {
                        var eid = waitingRoomService.getEnrolmentId();
                        StudentExamRes.enrolment.get({eid: eid},
                            function(enrolment) {
                                $scope.enrolment = enrolment;

                                setExamTeachers(enrolment.exam);

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

                function setExamTeachers(exam) {
                    exam.examTeachers = [];
                    exam.teachersStr = "";

                    StudentExamRes.teachers.get({id: exam.id}, function(inspections) {

                            angular.forEach(inspections, function (inspection) {
                                if(exam.examTeachers.indexOf(inspection.user.firstName + " " + inspection.user.lastName) === -1) {
                                    exam.examTeachers.push(inspection.user.firstName + " " + inspection.user.lastName);
                                }
                            });
                            angular.forEach(exam.examOwners, function(owner){
                                if(exam.examTeachers.indexOf(owner.firstName + " " + owner.lastName) === -1) {
                                    exam.examTeachers.push(owner.firstName + " " + owner.lastName);
                                }
                            });
                            exam.teachersStr = exam.examTeachers.map(function(teacher) {
                                return teacher;
                            }).join(", ");
                        },
                        function(error) {
                            toastr.error(error.data);
                        }
                    );
                }

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

                // This is just to get page refresh to route us back here
                $http.get('/checkSession');

            }]);
}());