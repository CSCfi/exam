'use strict';
import toast from "toastr";

const ReservationController = function ($location, ReservationResource, Reservation,
                                      $routeParams, $translate, $filter) {

    let _examId = $routeParams.eid ? parseInt($routeParams.eid) : undefined;

    const vm = this;

    vm.$onInit = function () {
        vm.startDate = vm.endDate = new Date();

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

        vm.machineOptions = [];

        vm.roomOptions = [];

        vm.examOptions = [];
        vm.examOptions.initSelection = function (element, callback) {
            if (_examId) {
                const selected = vm.examOptions.filter(function (d) {
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

        vm.studentOptions = [];

        vm.stateOptions = [];

        vm.teacherOptions = [];

        vm.examStates.forEach(function (state) {
            vm.stateOptions.push({
                id: state,
                label: 'sitnet_exam_status_' + state.toLowerCase()
            });
        });
        initOptions();
        vm.query();
    };


    vm.isAdminView = function () {
        return $location.path() === '/';
    };

    function initOptions() {
        ReservationResource.students.query(function (students) {
                vm.students = $filter('orderBy')(students, ['lastName', 'firstName']);
                vm.students.forEach(function (student) {
                    vm.studentOptions.push({id: student.id, value: student, label: student.name});
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
                    vm.examOptions.push({id: exam.id, value: exam, label: exam.name});
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
                        vm.teacherOptions.push({
                            id: owner.id,
                            value: owner,
                            label: owner.firstName + ' ' + owner.lastName
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
                        vm.roomOptions.push({id: room.id, value: room, label: room.name});
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
    }

    vm.roomChanged = function (room) {
        vm.selection.roomId = room;
        if (typeof vm.selection.roomId !== 'object') {
            return;
        }

        vm.machineOptions.length = 0;
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

    vm.ownerChanged = function (owner) {
        vm.selection.ownerId = owner;
        vm.query();
    };

    vm.stateChanged = function (state) {
        vm.selection.state = state;
        vm.query();
    };

    vm.studentChanged = function (student) {
        vm.selection.studentId = student;
        vm.query();
    };

    vm.machineChanged = function (machine) {
        vm.selection.machineId = machine;
        vm.query();
    };

    vm.examChanged = function (exam) {
        vm.selection.examId = exam;
        vm.query();
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
                        const state = Reservation.printExamState(r);
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
            label: room.name,
            isHeader: true,
            children: []
        };
        vm.machineOptions.push(data);
        machines.forEach(function (machine) {
            if (!roomContains(room, machine)) {
                return;
            }
            vm.machineOptions.push({id: machine.id, value: machine, label: machine.name === null ? '' : machine.name});
        });
    }

    function machinesForRooms(rooms, machines) {
        if (!rooms || !machines) {
            return;
        }
        rooms.forEach(function (room) {
            machinesForRoom(room, machines);
        });
    }

};

ReservationController.$inject = ['$location', 'ReservationResource', 'Reservation',
    '$routeParams', '$translate', '$filter'];

module.exports = ReservationController;