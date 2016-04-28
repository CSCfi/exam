(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReservationCtrl', ['ExamRes', '$scope', '$location', '$http', 'EXAM_CONF',
            'ReservationResource', 'reservationService', 'dateService', 'examService', '$timeout', '$routeParams', '$translate', '$filter',
            function (ExamRes, $scope, $location, $http, EXAM_CONF, ReservationResource, reservationService, dateService, examService,
                      $timeout, $routeParams, $translate, $filter) {

                var examId = $routeParams.eid ? parseInt($routeParams.eid) : undefined;
                $scope.selection = {examId: examId};

                var select2options = {
                    placeholder: '-',
                    data: [],
                    allowClear: true,
                    dropdownAutoWidth: true
                };

                $scope.machineOptions = angular.copy(select2options);

                $scope.roomOptions = angular.copy(select2options);

                $scope.examOptions = angular.copy(select2options);
                $scope.examOptions.initSelection = function (element, callback) {
                    if (examId) {
                        var selected = $scope.examOptions.data.filter(function (d) {
                            return d.id === examId;
                        });
                        if (selected.length > 0) {
                            callback(selected[0]);
                            // this reset is dumb but necessary because for some reason this callback is executed
                            // each time selection changes. Might be a problem with the (deprecated) ui-select2
                            // directive or not
                            examId = null;
                        }
                    }
                };

                $scope.studentOptions = angular.copy(select2options);

                $scope.stateOptions = angular.copy(select2options);

                $scope.teacherOptions = angular.copy(select2options);

                $scope.dateService = dateService;

                $scope.reservationDetails = EXAM_CONF.TEMPLATES_PATH + "reservation/reservation_details.html";


                $scope.isAdminView = function () {
                    return $location.path() === '/';
                };

                ReservationResource.students.query(function (students) {
                        $scope.students = $filter('orderBy')(students, ['lastName', 'firstName']);
                        $scope.students.forEach(function (student) {
                            $scope.studentOptions.data.push({id: student.id, text: student.name});
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                ReservationResource.exams.query(
                    function (exams) {
                        $scope.examnames = $filter('orderBy')(exams, 'name');
                        $scope.examnames.forEach(function (exam) {
                            $scope.examOptions.data.push({id: exam.id, text: exam.name});
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                if ($scope.isAdminView()) {
                    ReservationResource.teachers.query(function (teachers) {
                            $scope.examOwners = $filter('orderBy')(teachers, ['lastName', 'firstName']);
                            $scope.examOwners.forEach(function (owner) {
                                $scope.teacherOptions.data.push({
                                    id: owner.id,
                                    text: owner.firstName + " " + owner.lastName
                                });
                            });
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                    ReservationResource.examrooms.query(
                        function (examrooms) {
                            $scope.examrooms = examrooms;
                            examrooms.forEach(function (room) {
                                $scope.roomOptions.data.push({id: room.id, text: room.name});
                            });
                            // Load machines after rooms are loaded
                            ReservationResource.machines.query(
                                function (machines) {
                                    $scope.machines = machines;
                                    machinesForRooms(examrooms, machines);
                                },
                                function (error) {
                                    toastr.error(error.data);
                                }
                            );
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

                $scope.examStates.forEach(function (state) {
                    $scope.stateOptions.data.push({
                        id: state,
                        text: $translate.instant('sitnet_exam_status_' + state.toLowerCase())
                    });
                });

                $scope.printExamState = function (enrolment) {
                    if (!enrolment.reservation) {
                        console.warn("enrolment without reservation listed, possibly obsolete data #enrolment id: " +
                            enrolment.id);
                        return;
                    }
                    return enrolment.reservation.noShow ? 'NO_SHOW' : enrolment.exam.state;
                };


                $scope.roomChanged = function () {
                    if (typeof $scope.selection.roomId !== 'object') {
                        return;
                    }

                    $scope.machineOptions.data.length = 0;
                    if ($scope.selection.roomId === null) {
                        machinesForRooms($scope.examrooms, $scope.machines);
                    } else {
                        machinesForRoom(findRoom($scope.selection.roomId.id), $scope.machines);
                    }
                    $scope.query();
                };

                var somethingSelected = function (params) {
                    for (var k in params) {
                        if (!params.hasOwnProperty(k)) {
                            continue;
                        }
                        if (params[k]) {
                            return true;
                        }
                    }
                    return $scope.dateService.startDate || $scope.dateService.endDate;
                };

                $scope.query = function () {
                    var params = angular.copy($scope.selection);
                    if (somethingSelected(params)) {
                        // have to clear empty strings completely
                        for (var k in params) {
                            if (!params.hasOwnProperty(k)) {
                                continue;
                            }
                            if (params[k] === '' || params[k] === null) {
                                delete params[k];
                                continue;
                            }
                            if (typeof params[k] === 'object') {
                                params[k] = params[k].id;
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
                    reservationService.cancelReservation(enrolment.reservation).then(function () {
                        $scope.enrolments.splice($scope.enrolments.indexOf(enrolment), 1);
                        toastr.info($translate.instant('sitnet_reservation_removed'));
                    });
                };

                $scope.changeReservationMachine = function (reservation) {
                    reservationService.changeMachine(reservation);
                };

                $scope.permitRetrial = function (reservation) {
                    ExamRes.reservation.update({id: reservation.id}, function () {
                        reservation.retrialPermitted = true;
                        toastr.info($translate.instant('sitnet_retrial_permitted'));
                    });
                };

                function roomContains(examroom, machine) {
                    if (examroom && examroom.examMachines) {
                        return examroom.examMachines.some(function (roommachine) {
                            return (machine.id === roommachine.id);
                        });
                    }
                    return false;
                }

                function findRoom(id) {
                    return $scope.examrooms.find(function (room) {
                        return room.id === id;
                    });
                }

                function machinesForRoom(room, machines) {
                    if (room.examMachines.length < 1) {
                        return;
                    }
                    var data = {
                        text: room.name,
                        children: []
                    };
                    machines.forEach(function (machine) {
                        if (!roomContains(room, machine)) {
                            return;
                        }
                        data.children.push({id: machine.id, text: machine.name === null ? "" : machine.name});
                    });
                    $scope.machineOptions.data.push(data);
                }

                function machinesForRooms(rooms, machines) {
                    if (!rooms || !machines) {
                        return;
                    }
                    rooms.forEach(function (room) {
                        machinesForRoom(room, machines);
                    });
                }
            }
        ])
    ;
}());
