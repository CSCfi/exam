/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

var toastr = require('toastr');

angular.module('app.reservation')
    .component('reservations', {
        template: '<div ng-include="$ctrl.templateUrl"></div>',
        bindings: {
            'userRole': '@'
        },
        controller: ['ExamRes', '$location', '$http', 'EXAM_CONF',
            'ReservationResource', 'Reservation', 'Exam', '$timeout', '$routeParams', '$translate', '$filter',
            function (ExamRes, $location, $http, EXAM_CONF, ReservationResource, Reservation, Exam,
                      $timeout, $routeParams, $translate, $filter) {

                var select2options = {
                    placeholder: '-',
                    data: [],
                    allowClear: true,
                    dropdownAutoWidth: true
                };

                var ctrl = this;
                var examId = $routeParams.eid ? parseInt($routeParams.eid) : undefined;

                ctrl.$onInit = function () {
                    ctrl.startDate = ctrl.endDate = new Date();
                    if (ctrl.userRole === 'admin') {
                        ctrl.templateUrl = EXAM_CONF.TEMPLATES_PATH + 'reservation/admin/adminReservations.template.html';
                    } else if (ctrl.userRole === 'teacher') {
                        ctrl.templateUrl = EXAM_CONF.TEMPLATES_PATH + 'reservation/teacher/teacherReservations.template.html';
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
                    if (ctrl.userRole === 'admin') {
                        ctrl.examStates.push('EXTERNAL_UNFINISHED');
                        ctrl.examStates.push('EXTERNAL_FINISHED');
                    }

                    ctrl.selection = {examId: examId};

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

                    ctrl.reservationDetails = EXAM_CONF.TEMPLATES_PATH + 'reservation/reservation_details.html';

                    ctrl.examStates.forEach(function (state) {
                        ctrl.stateOptions.data.push({
                            id: state,
                            text: $translate.instant('sitnet_exam_status_' + state.toLowerCase())
                        });
                    });
                };


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
                                    text: owner.firstName + ' ' + owner.lastName
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

                ctrl.printExamState = function (reservation) {
                    return reservation.noShow ? 'NO_SHOW' : reservation.enrolment.exam.state;
                };


                ctrl.getStateclass = function (reservation) {
                    return reservation.noShow ? 'no_show' : reservation.enrolment.exam.state.toLowerCase();
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
                    ctrl.query();
                };

                ctrl.endDateChanged = function (date) {
                    ctrl.endDate = date;
                    ctrl.query();
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
                            function (reservations) {
                                reservations.forEach(function (r) {
                                    r.userAggregate = r.user ? r.user.lastName + r.user.firstName : r.externalUserRef;
                                    if (!r.enrolment || r.enrolment.externalExam) {
                                        r.enrolment = r.enrolment || {};
                                        var externalState = r.enrolment.finished ? 'EXTERNAL_FINISHED' :
                                            'EXTERNAL_UNFINISHED';
                                        r.enrolment.exam = {external: true, examOwners: [], state: externalState};
                                    }
                                    var exam = r.enrolment.exam.parent || r.enrolment.exam;
                                    r.enrolment.teacherAggregate = exam.examOwners.map(function (o) {
                                        return o.lastName + o.firstName;
                                    }).join();
                                    var state = ctrl.printExamState(r);
                                    r.stateOrd = ['PUBLISHED', 'NO_SHOW', 'STUDENT_STARTED', 'ABORTED', 'REVIEW',
                                        'REVIEW_STARTED', 'GRADED', 'GRADED_LOGGED', 'REJECTED', 'ARCHIVED',
                                        'EXTERNAL_UNFINISHED', 'EXTERNAL_FINISHED'].indexOf(state);
                                });
                                ctrl.reservations = reservations;
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                };

                ctrl.removeReservation = function (reservation) {
                    Reservation.cancelReservation(reservation).then(function () {
                        ctrl.reservations.splice(ctrl.reservations.indexOf(reservation), 1);
                        toastr.info($translate.instant('sitnet_reservation_removed'));
                    });
                };

                ctrl.changeReservationMachine = function (reservation) {
                    Reservation.changeMachine(reservation);
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
                        return er.id;
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
                        data.children.push({id: machine.id, text: machine.name === null ? '' : machine.name});
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

