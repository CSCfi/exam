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

import angular from 'angular';
import toast from 'toastr';

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

                const select2options = {
                    placeholder: '-',
                    data: [],
                    allowClear: true,
                    dropdownAutoWidth: true
                };

                let _examId = $routeParams.eid ? parseInt($routeParams.eid) : undefined;

                const vm = this;

                vm.$onInit = function () {
                    vm.startDate = vm.endDate = new Date();
                    if (vm.userRole === 'admin') {
                        vm.templateUrl = EXAM_CONF.TEMPLATES_PATH + 'reservation/admin/adminReservations.template.html';
                    } else if (vm.userRole === 'teacher') {
                        vm.templateUrl = EXAM_CONF.TEMPLATES_PATH + 'reservation/teacher/teacherReservations.template.html';
                    }
                    vm.examStates = [
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
                    if (vm.userRole === 'admin') {
                        vm.examStates.push('EXTERNAL_UNFINISHED');
                        vm.examStates.push('EXTERNAL_FINISHED');
                    }

                    vm.selection = {examId: _examId};

                    vm.machineOptions = angular.copy(select2options);

                    vm.roomOptions = angular.copy(select2options);

                    vm.examOptions = angular.copy(select2options);
                    vm.examOptions.initSelection = function (element, callback) {
                        if (_examId) {
                            const selected = vm.examOptions.data.filter(function (d) {
                                return d.id === _examId;
                            });
                            if (selected.length > 0) {
                                callback(selected[0]);
                                // this reset is dumb but necessary because for some reason this callback is executed
                                // each time selection changes. Might be a problem with the (deprecated) ui-select2
                                // directive or not
                                _examId = null;
                            }
                        }
                    };

                    vm.studentOptions = angular.copy(select2options);

                    vm.stateOptions = angular.copy(select2options);

                    vm.teacherOptions = angular.copy(select2options);

                    vm.reservationDetails = EXAM_CONF.TEMPLATES_PATH + 'reservation/reservation_details.html';

                    vm.examStates.forEach(function (state) {
                        vm.stateOptions.data.push({
                            id: state,
                            text: $translate.instant('sitnet_exam_status_' + state.toLowerCase())
                        });
                    });
                };


                vm.isAdminView = function () {
                    return $location.path() === '/';
                };

                ReservationResource.students.query(function (students) {
                        vm.students = $filter('orderBy')(students, ['lastName', 'firstName']);
                        vm.students.forEach(function (student) {
                            vm.studentOptions.data.push({id: student.id, text: student.name});
                        });
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );

                ReservationResource.exams.query(
                    function (exams) {
                        vm.examnames = $filter('orderBy')(exams, 'name');
                        vm.examnames.forEach(function (exam) {
                            vm.examOptions.data.push({id: exam.id, text: exam.name});
                        });
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );

                if (vm.isAdminView()) {
                    ReservationResource.teachers.query(function (teachers) {
                            vm.examOwners = $filter('orderBy')(teachers, ['lastName', 'firstName']);
                            vm.examOwners.forEach(function (owner) {
                                vm.teacherOptions.data.push({
                                    id: owner.id,
                                    text: owner.firstName + ' ' + owner.lastName
                                });
                            });
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );

                    ReservationResource.examrooms.query(
                        function (examrooms) {
                            vm.examrooms = examrooms;
                            examrooms.forEach(function (room) {
                                vm.roomOptions.data.push({id: room.id, text: room.name});
                            });
                            // Load machines after rooms are loaded
                            ReservationResource.machines.query(
                                function (machines) {
                                    vm.machines = machines;
                                    machinesForRooms(examrooms, machines);
                                },
                                function (error) {
                                    toast.error(error.data);
                                }
                            );
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                }

                vm.printExamState = function (reservation) {
                    return reservation.noShow ? 'NO_SHOW' : reservation.enrolment.exam.state;
                };


                vm.getStateclass = function (reservation) {
                    return reservation.noShow ? 'no_show' : reservation.enrolment.exam.state.toLowerCase();
                };

                vm.roomChanged = function () {
                    if (typeof vm.selection.roomId !== 'object') {
                        return;
                    }

                    vm.machineOptions.data.length = 0;
                    if (vm.selection.roomId === null) {
                        machinesForRooms(vm.examrooms, vm.machines);
                    } else {
                        machinesForRoom(findRoom(vm.selection.roomId.id), vm.machines);
                    }
                    vm.query();
                };

                vm.startDateChanged = function (date) {
                    vm.startDate = date;
                    vm.query();
                };

                vm.endDateChanged = function (date) {
                    vm.endDate = date;
                    vm.query();
                };

                const somethingSelected = function (params) {
                    for (let k in params) {
                        if (!params.hasOwnProperty(k)) {
                            continue;
                        }
                        if (params[k]) {
                            return true;
                        }
                    }
                    return vm.startDate || vm.endDate;
                };

                vm.query = function () {
                    const params = angular.copy(vm.selection);
                    if (somethingSelected(params)) {
                        // have to clear empty strings completely
                        for (let k in params) {
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

                        if (vm.startDate) {
                            params.start = vm.startDate;
                        }
                        if (vm.endDate) {
                            params.end = vm.endDate;
                        }

                        ReservationResource.reservations.query(params,
                            function (reservations) {
                                reservations.forEach(function (r) {
                                    r.userAggregate = r.user ? r.user.lastName + r.user.firstName : r.externalUserRef;
                                    if (!r.enrolment || r.enrolment.externalExam) {
                                        r.enrolment = r.enrolment || {};
                                        const externalState = r.enrolment.finished ? 'EXTERNAL_FINISHED' :
                                            'EXTERNAL_UNFINISHED';
                                        r.enrolment.exam = {external: true, examOwners: [], state: externalState};
                                    }
                                    const exam = r.enrolment.exam.parent || r.enrolment.exam;
                                    r.enrolment.teacherAggregate = exam.examOwners.map(function (o) {
                                        return o.lastName + o.firstName;
                                    }).join();
                                    const state = vm.printExamState(r);
                                    r.stateOrd = ['PUBLISHED', 'NO_SHOW', 'STUDENT_STARTED', 'ABORTED', 'REVIEW',
                                        'REVIEW_STARTED', 'GRADED', 'GRADED_LOGGED', 'REJECTED', 'ARCHIVED',
                                        'EXTERNAL_UNFINISHED', 'EXTERNAL_FINISHED'].indexOf(state);
                                });
                                vm.reservations = reservations;
                            }, function (error) {
                                toast.error(error.data);
                            });
                    }
                };

                vm.removeReservation = function (reservation) {
                    Reservation.cancelReservation(reservation).then(function () {
                        vm.reservations.splice(vm.reservations.indexOf(reservation), 1);
                        toast.info($translate.instant('sitnet_reservation_removed'));
                    });
                };

                vm.changeReservationMachine = function (reservation) {
                    Reservation.changeMachine(reservation);
                };

                vm.permitRetrial = function (reservation) {
                    ExamRes.reservation.update({id: reservation.id}, function () {
                        reservation.retrialPermitted = true;
                        toast.info($translate.instant('sitnet_retrial_permitted'));
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
                    const i = vm.examrooms.map(function (er) {
                        return er.id;
                    }).indexOf(id);
                    if (i >= 0) {
                        return vm.examrooms[i];
                    }
                    return undefined;
                }

                function machinesForRoom(room, machines) {
                    if (room.examMachines.length < 1) {
                        return;
                    }
                    const data = {
                        text: room.name,
                        children: []
                    };
                    machines.forEach(function (machine) {
                        if (!roomContains(room, machine)) {
                            return;
                        }
                        data.children.push({id: machine.id, text: machine.name === null ? '' : machine.name});
                    });
                    vm.machineOptions.data.push(data);
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

