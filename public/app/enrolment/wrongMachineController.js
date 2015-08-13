(function() {
    'use strict';
    angular.module("exam.controllers")
        .controller('WrongMachineCtrl', ['$scope', '$translate', '$http', '$location', 'sessionService', 'StudentExamRes', 'waitingRoomService', 'dateService',
            function($scope, $translate, $http, $location, sessionService, StudentExamRes, waitingRoomService, dateService) {

                var user = sessionService.getUser();

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

                var proceed = function() {
                    if (user && user.isStudent) {
                        var eid = waitingRoomService.getEnrolmentId();
                        StudentExamRes.enrolment.get({eid: eid},
                            function(enrolment) {
                                $scope.enrolment = enrolment;
                                setExamTeachers($scope.enrolment.exam);
                            },
                            function(error) {
                                toastr.error(error.data);
                            }
                        );
                    }
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