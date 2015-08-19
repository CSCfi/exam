(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReservationCtrl', ['ExamRes', '$scope', '$location', '$http', 'EXAM_CONF',
            'ReservationResource', 'dateService', 'examService', '$timeout', '$routeParams',
            function (ExamRes, $scope, $location, $http, EXAM_CONF, ReservationResource, dateService, examService, $timeout, $routeParams) {

                $scope.dateService = dateService;

                $scope.reservationDetails = EXAM_CONF.TEMPLATES_PATH + "reservation/reservation_details.html";

                $scope.selection = {examId: $routeParams.eid};

                $scope.isAdminView = function () {
                    return $location.path() === '/';
                };

                $scope.roomContains = function (examroom, machine) {
                    var isRoomMachine = false;
                    if (examroom && examroom.examMachines) {
                        angular.forEach(examroom.examMachines, function (roommachine) {
                            if (machine.id === roommachine.id) {
                                isRoomMachine = true;
                            }
                        });
                    }
                    return isRoomMachine;
                };

                ReservationResource.students.query(function (students) {
                        $scope.students = students;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                ReservationResource.exams.query(
                    function (exams) {
                        $scope.examnames = exams;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                if ($scope.isAdminView()) {
                    ReservationResource.teachers.query(function (teachers) {
                            $scope.examOwners = teachers;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                    ReservationResource.examrooms.query(
                        function (examrooms) {
                            $scope.examrooms = examrooms;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                    ReservationResource.machines.query(
                        function (machines) {
                            $scope.machines = machines;

                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

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

                $scope.printExamState = function (enrolment) {
                    if (moment(enrolment.reservation.endAt).isBefore(moment()) && !enrolment.exam.parent) {
                        return "NO_SHOW";
                    } else {
                        return enrolment.exam.state;
                    }
                };

                function initQuery() {
                    // Teacher not required to specify time ranges
                    if (!$scope.isAdminView() || ($scope.dateService.startDate && $scope.dateService.endDate)) {
                        var params = $scope.selection;
                        // have to clear empty strings completely
                        for (var k in params) {
                            if (params.hasOwnProperty(k) && params[k] === '') {
                                delete params[k];
                            }
                        }

                        if ($scope.dateService.startDate) {
                            params.start = Date.parse($scope.dateService.startDate);
                        }
                        if ($scope.dateService.endDate) {
                            params.end = Date.parse($scope.dateService.endDate);
                        }

                        ReservationResource.reservations.query(params,
                            function (enrolments) {
                                angular.forEach(enrolments, function (enrolment) {
                                    examService.setExamOwnersAndInspectors(enrolment.exam, true);
                                });
                                $scope.enrolments = enrolments;
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                }

                $timeout(initQuery, 500);

                $scope.query = function () {
                    initQuery();
                };

                $scope.removeReservation = function (enrolment) {
                    ReservationResource.reservation.remove({id: enrolment.reservation.id}, null,
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

                $scope.noShowFilter = function(enrolment) {
                    var status = $scope.printExamState(enrolment);
                    return status != "NO_SHOW";
                };
            }
        ])
    ;
}());