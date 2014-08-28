(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AdminReservationController', ['$scope', '$translate', '$location', '$http', 'SITNET_CONF', 'AdminReservationResource', 'dateService',
            function ($scope, $translate, $location, $http, SITNET_CONF, AdminReservationResource, dateService) {

                $scope.dateService = dateService;

                $scope.examReservations = SITNET_CONF.TEMPLATES_PATH + "admin/reservations.html";

                $scope.reservationDetails = SITNET_CONF.TEMPLATES_PATH + "admin/reservation_details.html";

                $scope.selectedStudent;
                $scope.selectedExamRoom;
                $scope.selectedExam;
                $scope.enrolments;


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

                $scope.examrooms = AdminReservationResource.examrooms.query(null,
                    function (examrooms) {
                        $scope.examrooms = examrooms;

                    },
                    function (error) {
                        toastr.error(error.data);
                    },
                    function(update) {
                        toastr.info(update.data);
                    }
                );

                $scope.examrooms = AdminReservationResource.exams.query(null,
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

                $scope.setExam = function (value) {
                    $scope.selectedExam = value;
                    $scope.selectedExamRoom = null;
                    $scope.selectedStudent = null;

                    $scope.getReservationsByExam();

                }

                $scope.setRoom = function (value) {
                    $scope.selectedExamRoom = value;
                    $scope.selectedStudent = null;
                    $scope.selectedExam = null;

                    $scope.getReservationsByRoom();

                }

                $scope.setStudent = function (value) {
                    $scope.selectedStudent = value;
                    $scope.selectedExamRoom = null;
                    $scope.selectedExam = null;

                    $scope.getReservationsByStudent();
                }

                $scope.updateReservationsTable = function () {

                    if ($scope.selectedStudent != null) {
                        $scope.getReservationsByStudent();
                    } else if ($scope.selectedExamRoom != null) {
                        $scope.getReservationsByRoom();
                    } else if ($scope.selectedExam != null) {
                        $scope.getReservationsByExam();
                    }

                };

                $scope.getReservations = function() {

                    AdminReservationResource.reservationListing.query({userId: $scope.selectedStudent, roomId: $scope.selectedRoom, examId: $scope.selectedExam},
                    function (enrolments) {
                        $scope.enrolments = enrolments;
                    }, function (error) {
                        toastr.error(error.data);
                    });


                };

                $scope.getReservationsByStudent = function() {

                    AdminReservationResource.reservationListingByStudent.query({userId: $scope.selectedStudent, start: $scope.dateService.startTimestamp, end: $scope.dateService.endTimestamp},
                    function (enrolments) {
                        $scope.enrolments = enrolments;

                    }, function (error) {
                        toastr.error(error.data);
                    });


                };

                $scope.getReservationsByRoom = function() {

                    AdminReservationResource.reservationListingByRoom.query({roomId: $scope.selectedExamRoom, start: $scope.dateService.startTimestamp, end: $scope.dateService.endTimestamp},
                    function (enrolments) {
                        $scope.enrolments = enrolments;

                    }, function (error) {
                        toastr.error(error.data);
                    });

                };

                $scope.getReservationsByExam = function() {

                    AdminReservationResource.reservationListingByExam.query({examId: $scope.selectedExam, start: $scope.dateService.startTimestamp, end: $scope.dateService.endTimestamp},
                    function (enrolments) {
                        $scope.enrolments = enrolments;

                    }, function (error) {
                        toastr.error(error.data);
                    });

                };

                $scope.removeReservation = function (value) {
                    AdminReservationResource.reservationDeletion.remove({id: value}, null,
                    function (result) {
                        $location.path("admin/reservations/")
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };


            }]);
}());