(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReservationCtrl', ['ExamRes', '$scope', '$location', '$http', 'EXAM_CONF',
            'ReservationResource', 'dateService', 'examService', '$timeout', '$routeParams', '$translate',
            function (ExamRes, $scope, $location, $http, EXAM_CONF, ReservationResource, dateService, examService,
                      $timeout, $routeParams, $translate) {

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
                    'REJECTED',
                    'ARCHIVED',
                    'STUDENT_STARTED',
                    'PUBLISHED',
                    'ABORTED',
                    'NO_SHOW'
                ];

                $scope.printExamState = function (enrolment) {
                    return enrolment.reservation.noShow ? 'NO_SHOW' : enrolment.exam.state;
                };

                $scope.query = function () {
                    // Teacher not required to specify time ranges
                    if (!$scope.isAdminView() || ($scope.dateService.startDate && $scope.dateService.endDate)) {
                        var params = $scope.selection;
                        // have to clear empty strings completely
                        for (var k in params) {
                            if (params.hasOwnProperty(k) && params[k] === '') {
                                delete params[k];
                            }
                        }

                        var tzOffset = new Date().getTimezoneOffset() * 60000;

                        if ($scope.dateService.startDate) {
                            params.start = Date.parse($scope.dateService.startDate) + tzOffset;
                        }
                        if ($scope.dateService.endDate) {
                            params.end = Date.parse($scope.dateService.endDate);
                        }

                        ReservationResource.reservations.query(params,
                            function (enrolments) {
                                enrolments.forEach(function (e) {
                                    e.userAggregate = e.user.lastName + e.user.firstName;
                                    var exam = e.exam.parent || e.exam;
                                    e.teacherAggregate = exam.examOwners.map(function (o) {
                                        return o.lastName + o.firstName;
                                    }).join();
                                    var state = $scope.printExamState(e);
                                    e.stateOrd = ['PUBLISHED', 'NO_SHOW', 'STUDENT_STARTED', 'ABORTED', 'REVIEW',
                                        'REVIEW_STARTED', 'GRADED', 'GRADED_LOGGED', 'REJECTED', 'ARCHIVED'].indexOf(state);
                                });
                                $scope.enrolments = enrolments;
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                };

                $scope.removeReservation = function (enrolment) {
                    ReservationResource.reservation.remove({id: enrolment.reservation.id}, null,
                        function () {
                            $scope.enrolments.splice($scope.enrolments.indexOf(enrolment), 1);
                            toastr.info($translate.instant('sitnet_reservation_removed'));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.permitRetrial = function (reservation) {
                    ExamRes.reservation.update({id: reservation.id}, function () {
                        reservation.retrialPermitted = true;
                        toastr.info($translate.instant('sitnet_retrial_permitted'));
                    });
                }

            }
        ])
    ;
}());
