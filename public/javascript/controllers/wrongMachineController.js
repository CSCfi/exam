(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('WrongMachineCtrl', ['$scope', '$translate', '$location', 'sessionService', 'StudentExamRes', 'waitingRoomService', 'dateService',
            function($scope, $translate, $location, sessionService, StudentExamRes, waitingRoomService, dateService) {

                var user = sessionService.getUser();

                var proceed = function() {
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
                            },
                            function(error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                $scope.$on('wrongMachine', function() {
                    if (!$scope.enrolment) {
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

            }]);
}());