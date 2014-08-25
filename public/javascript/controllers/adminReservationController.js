(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AdminReservationController', ['$scope', '$translate', '$location', '$http', 'SITNET_CONF', 'AdminReservationResource', 'dateService',
            function ($scope, $translate, $location, $http, SITNET_CONF, AdminReservationResource, dateService) {

                $scope.dateService = dateService;

                $scope.examReservations = SITNET_CONF.TEMPLATES_PATH + "admin/reservations.html";

                $scope.selectedRoom = {
                    name: $translate("sitnet_choose")
                };

                //$scope.rooms = AdminReservationResource.rooms.query();
                $scope.students = AdminReservationResource.students.query();
                //$scope.examnames = ReportResource.examnames.query();


//                $scope.setExam = function (exam) {
//                    $scope.selectedExam = exam;
//                }
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