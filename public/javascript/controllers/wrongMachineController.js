(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('WrongMachineCtrl', ['$scope', '$translate', '$location', 'sessionService', 'StudentExamRes', 'waitingRoomService',
            function($scope, $translate, $location, sessionService, StudentExamRes, waitingRoomService) {

                $scope.session = sessionService;
                console.log($scope.session.login());
                $scope.user = $scope.session.user;

                var proceed = function() {
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
                    if ($scope.session.user) {
                        return $scope.session.user.firstname + " " + $scope.session.user.lastname;
                    } return "not logged";
                };

            }]);
}());