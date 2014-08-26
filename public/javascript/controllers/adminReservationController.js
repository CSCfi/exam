(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AdminReservationController', ['$scope', '$translate', '$location', '$http', 'SITNET_CONF', 'AdminReservationResource', 'dateService',
            function ($scope, $translate, $location, $http, SITNET_CONF, AdminReservationResource, dateService) {

                $scope.dateService = dateService;

                $scope.examReservations = SITNET_CONF.TEMPLATES_PATH + "admin/reservations.html";

                $scope.selectedStudent = {
                    id: 1,
                    firstName: "Test",
                    lastName: "Student"
                };

                AdminReservationResource.students.query(null,
                    function (students) {
                        $scope.students = students;
                    },
                    function (error) {
                        toastr.error(error.data);
                    },
                    function(update) {
                        toastr.info(update.data);
                    }
                );

                $scope.examnames = AdminReservationResource.exams.query(null,
                    function (exams) {
                        $scope.examnames = exams;
                    },
                    function (error) {
                        toastr.error(error.data);
                    },
                    function(update) {
                        toastr.info(update.data);
                    }
                );


                $scope.getStudents = function (callback) {

                    callback( $scope.themStudents);
                };



                $scope.setExam = function (value) {
                    $scope.selectedExam = value;
                }
//                $scope.setRoom = function (room) {
//                    $scope.selectedRoom = room;
//                }

                $scope.setStudent = function (value) {
                    $scope.selectedStudent = value;
                }

                $scope.getReservations = function() {

                    AdminReservationResource.reservations.get({userId: $scope.selectedUser.id, roomId: $scope.selectedRoom.id, examId: $scope.selectedExam.id},
                    function (data) {

                    }, function (error) {
                        toastr.error(error.data);
                    });

//                    $location.path("#/statistics/resbydate/1/01.01.2014/29.08.2014");

                };

                $scope.removeReservation = function () {
                }


            }]);
}());