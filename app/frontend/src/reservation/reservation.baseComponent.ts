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
import { HttpClient } from '@angular/common/http';
import { Inject, OnInit } from '@angular/core';
import { StateParams } from '@uirouter/core';
import * as _ from 'lodash';
import { OrderPipe } from 'ngx-order-pipe';
import { of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService, User } from '../session/session.service';
import { Option } from '../utility/select/dropDownSelect.component';
import { ExamMachine, ExamRoom, Reservation } from './reservation.model';
import { ReservationService } from './reservation.service';

interface Selection {
    roomId?: number;
    examId?: string;
    ownerId?: number;
    studentId?: number;
    machineId?: number;
    state?: string;
}

interface ReservationDisplay extends Reservation {
    userAggregate: string;
    teacherAggregate: string;
    org: string;
}

export class ReservationComponentBase implements OnInit {
    examId: string | undefined;
    user: User;
    startDate: Date = new Date();
    endDate: Date = new Date();
    examStates = [
        'REVIEW',
        'REVIEW_STARTED',
        'GRADED',
        'GRADED_LOGGED',
        'REJECTED',
        'ARCHIVED',
        'STUDENT_STARTED',
        'PUBLISHED',
        'ABORTED',
        'NO_SHOW',
    ];
    selection: Selection;
    stateOptions: Option[];
    examOptions: Option[];
    roomOptions: Option[];
    machineOptions: Option[];
    studentOptions: Option[];
    teacherOptions: Option[];
    rooms: any[];
    machines: any[];
    reservations: any[];
    isInteroperable: boolean;
    externalReservationsOnly: boolean;

    constructor(
        private http: HttpClient,
        @Inject('$stateParams') private stateParams: StateParams,
        private orderPipe: OrderPipe,
        private Session: SessionService,
        private Reservation: ReservationService,
    ) {
        this.examId = this.stateParams.eid;
        this.user = this.Session.getUser();

        if (this.user.isAdmin) {
            this.examStates.push('EXTERNAL_UNFINISHED');
            this.examStates.push('EXTERNAL_FINISHED');
        }
    }

    ngOnInit() {
        this.selection = { examId: this.examId };
        this.initOptions();
        this.query();
        this.stateOptions = this.examStates.map(s => {
            return { id: s, label: `sitnet_exam_status_${s.toLowerCase()}` };
        });
    }

    query() {
        const params: any = { ...this.selection }; // copy
        if (this.somethingSelected(params)) {
            // have to clear empty strings completely
            for (const k in params) {
                if (!Object.prototype.hasOwnProperty.call(params, k)) {
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

            if (!_.isNumber(parseInt(params.examId))) {
                params.externalRef = params.examId;
                delete params.examId;
            }

            if (this.startDate) {
                params.start = this.startDate;
            }
            if (this.endDate) {
                params.end = this.endDate;
            }

            this.http.get<any[]>('/app/reservations', { params: params }).subscribe(
                reservations => {
                    reservations.forEach(r => {
                        r.userAggregate = r.user
                            ? `${r.user.lastName}  ${r.user.firstName}`
                            : r.externalUserRef
                            ? r.externalUserRef
                            : r.enrolment.exam.id.toString();
                        // Transfer exam taken here
                        if (!r.enrolment || r.enrolment.externalExam) {
                            r.enrolment = r.enrolment || {};
                            const state =
                                r.enrolment.externalExam && r.enrolment.externalExam.finished
                                    ? 'EXTERNAL_FINISHED'
                                    : 'EXTERNAL_UNFINISHED';
                            r.enrolment.exam = { external: true, examOwners: [], state: state };
                        }
                        // Transfer exam taken elsewhere
                        if (r.externalReservation) {
                            r.org = { name: r.externalReservation.orgName, code: r.externalReservation.orgCode };
                            r.machine = {
                                name: r.externalReservation.machineName,
                                room: { name: r.externalReservation.roomName },
                            };
                        }
                        // Collaborative exam
                        if (r.enrolment.collaborativeExam) {
                            if (!r.enrolment.exam) {
                                r.enrolment.exam = r.enrolment.collaborativeExam;
                            }
                            r.enrolment.exam.examOwners = [];
                        }
                        if (!r.enrolment.exam) {
                            console.warn('no exam for enrolment ' + r.enrolment.id);
                        } else {
                            const exam = r.enrolment.exam.parent || r.enrolment.exam;
                            r.enrolment.teacherAggregate = exam.examOwners
                                .map(function(o) {
                                    return o.lastName + o.firstName;
                                })
                                .join();
                            const state = this.Reservation.printExamState(r);
                            r.stateOrd = [
                                'PUBLISHED',
                                'NO_SHOW',
                                'STUDENT_STARTED',
                                'ABORTED',
                                'REVIEW',
                                'REVIEW_STARTED',
                                'GRADED',
                                'GRADED_LOGGED',
                                'REJECTED',
                                'ARCHIVED',
                                'EXTERNAL_UNFINISHED',
                                'EXTERNAL_FINISHED',
                            ].indexOf(state);
                        }
                    });
                    this.reservations = reservations.filter(
                        r => r.externalReservation || !this.externalReservationsOnly,
                    );
                },
                resp => toast.error(resp),
            );
        }
    }

    isAdminView = () => this.user.isAdmin;

    private initOptions() {
        this.http.get<{ id: number; name: string }[]>('/app/reservations/students').subscribe(
            resp => {
                const students = this.orderPipe.transform(resp, ['lastName', 'firstName']);
                this.studentOptions = students.map(s => {
                    return { id: s.id, value: s, label: s.name };
                });
            },
            resp => toast.error(resp.data),
        );
        this.http.get<{ isExamVisitSupported: boolean }>('/settings/iop/examVisit').subscribe(resp => {
            this.isInteroperable = resp.isExamVisitSupported;
            this.initExamOptions();
        });

        if (this.isAdminView()) {
            this.http.get<{ id: number; name: string }[]>('/app/reservations/teachers').subscribe(
                resp => {
                    const teachers = this.orderPipe.transform(resp, ['lastName', 'firstName']);
                    this.teacherOptions = teachers.map(t => {
                        return { id: t.id, value: t, label: t.name };
                    });
                },
                resp => toast.error(resp.data),
            );

            this.http.get<ExamRoom>('/app/reservations/examrooms').subscribe(
                resp => {
                    this.rooms = this.orderPipe.transform(resp, 'name');
                    this.roomOptions = this.rooms.map(r => {
                        return { id: r.id, value: r, label: r.name };
                    });
                    this.http.get<ExamMachine>('/app/machines').subscribe(resp => {
                        this.machines = this.orderPipe.transform(resp, 'name');
                        this.machineOptions = this.machinesForRooms(this.rooms, this.machines);
                    });
                },
                err => toast.error(err.data),
            );
        }
    }

    protected initExamOptions(): void {
        this.http.get<any[]>('/app/reservations/exams').pipe(
            switchMap(exams => {
                if (this.isInteroperable && this.isAdminView()) {
                    // Load also collaborative exams.
                    return this.http.get<any[]>('/integration/iop/exams').pipe(
                        map(ee => {
                            return exams.concat(
                                ee.map(e => {
                                    return { id: e.externalRef, name: e.name };
                                }),
                            );
                        }),
                    );
                }
                return of(exams);
            }),
            tap(exams => {
                const filteredExams = this.orderPipe.transform(exams, 'name');
                this.examOptions = filteredExams.map(e => {
                    return { id: e.id, value: e, label: e.name };
                });
            }),
        );
    }

    private roomContains = (room, machine) => room.examMachines.some(m => m.id === machine.id);

    private machinesForRoom(room, machines): Option[] {
        if (room.examMachines.length < 1) {
            return [];
        }
        const data = {
            id: undefined,
            label: room.name,
            isHeader: true,
        };
        return [data].concat(
            machines
                .filter(m => this.roomContains(room, m))
                .map(m => {
                    return { id: m.id, value: m, label: m.name == null ? '' : m.name };
                }),
        );
    }

    private machinesForRooms = (rooms: any[], machines): Option[] =>
        rooms.map(r => this.machinesForRoom(r, machines)).reduce((a, b) => a.concat(b), []);

    roomChanged(room: Option | undefined) {
        if (room === undefined) {
            delete this.selection.roomId;
            this.machineOptions = this.machinesForRooms(this.rooms, this.machines);
        } else {
            this.selection.roomId = room.id;
            this.machineOptions = this.machinesForRoom(room, this.machines);
        }
        this.query();
    }

    startDateChanged(date) {
        this.startDate = date;
        this.query();
    }

    endDateChanged(date) {
        this.endDate = date;
        this.query();
    }

    externalReservationFilterClicked() {
        this.query();
    }

    private somethingSelected(params) {
        for (const k in params) {
            if (!Object.prototype.hasOwnProperty.call(params, k)) {
                continue;
            }
            if (params[k]) {
                return true;
            }
        }
        return this.startDate || this.endDate;
    }

    ownerChanged(owner) {
        this.selection.ownerId = owner ? owner.id : undefined;
        this.query();
    }

    stateChanged(state) {
        this.selection.state = state;
        this.query();
    }

    studentChanged(student) {
        this.selection.studentId = student ? student.id : undefined;
        this.query();
    }

    machineChanged(machine) {
        this.selection.machineId = machine ? machine.id : undefined;
        this.query();
    }

    examChanged(exam) {
        this.selection.examId = exam ? exam.id : undefined;
        this.query();
    }
}
