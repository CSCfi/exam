'use strict';
angular.module('app.reservation')
    .component("reservations", {
        templateUrl: '/assets/app/reservation/reservations.template.html',
        bindings: {
            'userRole': '@'
        },
        controller: ['ExamRes', '$location', '$http', 'EXAM_CONF',
            'ReservationResource', 'reservationService', 'examService', '$timeout', '$routeParams', '$translate', '$filter',
            function (ExamRes, $location, $http, EXAM_CONF, ReservationResource, reservationService, examService,
                      $timeout, $routeParams, $translate, $filter) {


                var ctrl = this;

                ctrl.$onInit = function () {
                   if (ctrl.userRole === 'admin') {
                       ctrl.templateUrl = EXAM_CONF.TEMPLATES_PATH + "reservation/admin/adminReservations.template.html";
                   } else if (ctrl.userRole === 'teacher') {
                       ctrl.templateUrl = EXAM_CONF.TEMPLATES_PATH + "reservation/teacher/teacherReservations.template.html";
                   }
                };


                var examId = $routeParams.eid ? parseInt($routeParams.eid) : undefined;

                ctrl.selection = {examId: examId};

                var select2options = {
                    placeholder: '-',
                    data: [],
                    allowClear: true,
                    dropdownAutoWidth: true
                };

                ctrl.machineOptions = angular.copy(select2options);

                ctrl.roomOptions = angular.copy(select2options);

                ctrl.examOptions = angular.copy(select2options);
                ctrl.examOptions.initSelection = function (element, callback) {
                    if (examId) {
                        var selected = ctrl.examOptions.data.filter(function (d) {
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

                ctrl.studentOptions = angular.copy(select2options);

                ctrl.stateOptions = angular.copy(select2options);

                ctrl.teacherOptions = angular.copy(select2options);

                ctrl.reservationDetails = EXAM_CONF.TEMPLATES_PATH + "reservation/reservation_details.html";


                ctrl.isAdminView = function () {
                    return $location.path() === '/';
                };

                ReservationResource.students.query(function (students) {
                        ctrl.students = $filter('orderBy')(students, ['lastName', 'firstName']);
                        ctrl.students.forEach(function (student) {
                            ctrl.studentOptions.data.push({id: student.id, text: student.name});
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                ReservationResource.exams.query(
                    function (exams) {
                        ctrl.examnames = $filter('orderBy')(exams, 'name');
                        ctrl.examnames.forEach(function (exam) {
                            ctrl.examOptions.data.push({id: exam.id, text: exam.name});
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                if (ctrl.isAdminView()) {
                    ReservationResource.teachers.query(function (teachers) {
                            ctrl.examOwners = $filter('orderBy')(teachers, ['lastName', 'firstName']);
                            ctrl.examOwners.forEach(function (owner) {
                                ctrl.teacherOptions.data.push({
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
                            ctrl.examrooms = examrooms;
                            examrooms.forEach(function (room) {
                                ctrl.roomOptions.data.push({id: room.id, text: room.name});
                            });
                            // Load machines after rooms are loaded
                            ReservationResource.machines.query(
                                function (machines) {
                                    ctrl.machines = machines;
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

                ctrl.examStates = [
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

                ctrl.examStates.forEach(function (state) {
                    ctrl.stateOptions.data.push({
                        id: state,
                        text: $translate.instant('sitnet_exam_status_' + state.toLowerCase())
                    });
                });

                ctrl.stateclass = "";
                ctrl.printExamState = function (enrolment) {
                    return enrolment.reservation.noShow ? 'NO_SHOW' : enrolment.exam.state;
                };


                ctrl.getStateclass = function (enrolment) {
                    return enrolment.reservation.noShow ? 'no_show' : enrolment.exam.state.toLowerCase();

                };


                ctrl.roomChanged = function () {
                    if (typeof ctrl.selection.roomId !== 'object') {
                        return;
                    }

                    ctrl.machineOptions.data.length = 0;
                    if (ctrl.selection.roomId === null) {
                        machinesForRooms(ctrl.examrooms, ctrl.machines);
                    } else {
                        machinesForRoom(findRoom(ctrl.selection.roomId.id), ctrl.machines);
                    }
                    ctrl.query();
                };

                ctrl.startDateChanged = function (date) {
                    ctrl.startDate = date;
                };

                ctrl.endDateChanged = function (date) {
                    ctrl.endDate = date;
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
                    return ctrl.startDate || ctrl.endDate;
                };

                ctrl.query = function () {
                    var params = angular.copy(ctrl.selection);
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

                        if (ctrl.startDate) {
                            params.start = ctrl.startDate;
                        }
                        if (ctrl.endDate) {
                            params.end = ctrl.endDate;
                        }

                        ReservationResource.reservations.query(params,
                            function (enrolments) {
                                enrolments.forEach(function (e) {
                                    e.userAggregate = e.user.lastName + e.user.firstName;
                                    var exam = e.exam.parent || e.exam;
                                    e.teacherAggregate = exam.examOwners.map(function (o) {
                                        return o.lastName + o.firstName;
                                    }).join();
                                    var state = ctrl.printExamState(e);
                                    e.stateOrd = ['PUBLISHED', 'NO_SHOW', 'STUDENT_STARTED', 'ABORTED', 'REVIEW',
                                        'REVIEW_STARTED', 'GRADED', 'GRADED_LOGGED', 'REJECTED', 'ARCHIVED'].indexOf(state);
                                });
                                ctrl.enrolments = enrolments;
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                };

                ctrl.removeReservation = function (enrolment) {
                    reservationService.cancelReservation(enrolment.reservation).then(function () {
                        ctrl.enrolments.splice(ctrl.enrolments.indexOf(enrolment), 1);
                        toastr.info($translate.instant('sitnet_reservation_removed'));
                    });
                };

                ctrl.changeReservationMachine = function (reservation) {
                    reservationService.changeMachine(reservation);
                };

                ctrl.permitRetrial = function (reservation) {
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
                    var i = ctrl.examrooms.map(function (er) {
                        return er.id
                    }).indexOf(id);
                    if (i >= 0) {
                        return ctrl.examrooms[i];
                    }
                    return undefined;
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
                    ctrl.machineOptions.data.push(data);
                }

                function machinesForRooms(rooms, machines) {
                    if (!rooms || !machines) {
                        return;
                    }
                    rooms.forEach(function (room) {
                        machinesForRoom(room, machines);
                    });
                }
            }
        ]
    });

