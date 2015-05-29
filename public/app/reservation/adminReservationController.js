(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AdminReservationController', ['ExamRes', '$scope', '$location', '$http', 'SITNET_CONF', 'AdminReservationResource', 'dateService',
            function (ExamRes, $scope, $location, $http, SITNET_CONF, AdminReservationResource, dateService) {

                $scope.dateService = dateService;

                $scope.examReservations = SITNET_CONF.TEMPLATES_PATH + "reservation/reservations.html";

                $scope.reservationDetails = SITNET_CONF.TEMPLATES_PATH + "reservation/reservation_details.html";

                $scope.selection = {};

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

                function setExamOwners(exam) {
                    exam.teachersStr = "";
                    var i = 0;
                    angular.forEach(exam.examOwners, function (owner) {
                        if (owner.lastName && owner.lastName.length > 0) {
                            if (i !== 0) {
                                exam.teachersStr += ", ";
                            }
                            i++;
                            if ($scope.user.isStudent) {
                                exam.teachersStr += owner.firstName + " " + owner.lastName;
                            } else {
                                exam.teachersStr += "<b>" + owner.firstName + " " + owner.lastName + "</b>";
                            }
                        }
                    });
                    i = 0;
                    angular.forEach(exam.examInspections, function (inspection) {
                        if (exam.teachersStr.indexOf("<b>" + inspection.user.firstName + " " + inspection.user.lastName + "</b>") === -1) {
                            if (i !== 0 || (i === 0 && exam.teachersStr.length > 0)) {
                                exam.teachersStr += ", ";
                            }
                            i++;
                            if ($scope.user.isStudent) {
                                exam.teachersStr += inspection.user.firstName + " " + inspection.user.lastName;
                            } else {
                                exam.teachersStr += "<span>" + inspection.user.firstName + " " + inspection.user.lastName + "</span>";
                            }
                        }
                    });
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
                                angular.forEach(enrolments, function (enrolment) {
                                    setExamOwners(enrolment.exam);
                                });
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                }

                initQuery();

                $scope.query = function () {
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