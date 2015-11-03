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
                                $scope.enrolment = enrolment;
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
