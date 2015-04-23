(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AdminReservationController', ['$scope', '$location', '$http', 'SITNET_CONF', 'AdminReservationResource', 'dateService',
            function ($scope, $location, $http, SITNET_CONF, AdminReservationResource, dateService) {

                $scope.dateService = dateService;

                $scope.examReservations = SITNET_CONF.TEMPLATES_PATH + "reservation/reservations.html";

                $scope.reservationDetails = SITNET_CONF.TEMPLATES_PATH + "reservation/reservation_details.html";

                $scope.selection = {};

                $scope.roomContains = function(examroom, machine) {

                    var isRoomMachine = false;
                    if(examroom && examroom.examMachines) {
                        angular.forEach(examroom.examMachines, function(roommachine){
                           if(machine.id === roommachine.id) {
                               isRoomMachine = true;
                           }
                        });
                    }
                    return isRoomMachine;
                };

                AdminReservationResource.students.query(function (students) {
                        $scope.students = students;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                AdminReservationResource.teachers.query(function (teachers) {
                        $scope.examOwners = teachers;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                AdminReservationResource.examrooms.query(
                    function (examrooms) {
                        $scope.examrooms = examrooms;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                AdminReservationResource.exams.query(
                    function (exams) {
                        $scope.examnames = exams;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.printTeachers = function(examOwners) {
                    if(examOwners && examOwners.length > 0) {
                        return examOwners.map(function (teacher) {
                            return teacher.firstName + " " + teacher.lastName;
                        }).join(", ");
                    }
                    return "";
                };

                $scope.examStates = [
                        'REVIEW',
                        'REVIEW_STARTED',
                        'GRADED',
                        'GRADED_LOGGED',
                        'STUDENT_STARTED',
                        'PUBLISHED',
                        'ABORTED',
                        'NO_SHOW'
                    ];

                $scope.printExamState = function(enrolment) {
                    if(enrolment.reservation.machine.otherIdentifier === "NO_SHOW") {
                        return "NO_SHOW";
                    } else {
                        return enrolment.exam.state;
                    }
                };

                AdminReservationResource.machines.query(
                    function (machines) {
                        $scope.machines = machines;

                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                function initQuery() {

                    if ($scope.dateService.startDate && $scope.dateService.endDate) {
                        var params = $scope.selection;
                        // have to clear empty strings completely
                        for (var k in params) {
                            if (params.hasOwnProperty(k) && params[k] === '') {
                                params[k] = undefined;
                            }
                        }
                        params.start = Date.parse($scope.dateService.startDate);
                        params.end = Date.parse($scope.dateService.endDate);

                        AdminReservationResource.reservations.query(params,
                            function (enrolments) {
                                $scope.enrolments = enrolments;
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                }

                initQuery();

                $scope.query = function() {
                    initQuery();
                };

                $scope.removeReservation = function (enrolment) {
                    AdminReservationResource.reservationDeletion.remove({id: enrolment.reservation.id}, null,
                        function () {
                            $scope.enrolments.splice($scope.enrolments.indexOf(enrolment), 1);
                            $location.path("admin/reservations/");
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.sort = {
                    column: 'reservation.startAt',
                    order: false
                };

                $scope.toggleSort = function (value) {
                    if ($scope.sort.column == value) {
                        $scope.sort.order = !$scope.sort.order;
                        return;
                    }

                    $scope.sort.column = value;
                    $scope.sort.order = !$scope.sort.order;
                };
            }]);
}());