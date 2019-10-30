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

import { ExamEnrolment } from '../enrolment/enrolment.model';
import { CollaborativeExam, Exam } from '../exam/exam.model';
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

interface Params {
    [key: string]: unknown;
}

// All of this is needed to put all our reservations in one basket :D
type ExamEnrolmentDisplay = ExamEnrolment & { teacherAggregate: string };
type MachineDisplay = Omit<ExamMachine, 'room'> & { room: Partial<ExamRoom> };
type ReservationDisplay = Omit<Reservation, 'machine' | 'enrolment'> & {
    machine: Partial<MachineDisplay>;
    userAggregate: string;
    stateOrd: number;
    enrolment: ExamEnrolmentDisplay;
};
type LocalTransferExamEnrolment = Omit<ExamEnrolmentDisplay, 'exam'> & {
    exam: { id: number; external: true; examOwners: User[]; state: string; parent: null };
};
type CollaborativeExamEnrolment = Omit<ExamEnrolmentDisplay, 'exam'> & {
    exam: CollaborativeExam & { examOwners: User[]; parent: null };
};
type LocalTransferExamReservation = Omit<ReservationDisplay, 'enrolment'> & {
    enrolment: LocalTransferExamEnrolment;
};
type RemoteTransferExamReservation = Omit<ReservationDisplay, 'enrolment'> & {
    enrolment: ExamEnrolmentDisplay;
    org: { name: string; code: string };
};
type CollaborativeExamReservation = Omit<ReservationDisplay, 'enrolment'> & {
    enrolment: CollaborativeExamEnrolment;
};
type AnyReservation =
    | ReservationDisplay
    | LocalTransferExamReservation
    | RemoteTransferExamReservation
    | CollaborativeExamReservation;

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
    rooms: ExamRoom[];
    machines: ExamMachine[];
    reservations: AnyReservation[];
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

    private createParams = (input: Selection) => {
        const params: any = { ...input }; // copy
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
        return params;
    };

    private isLocalTransfer = (reservation: AnyReservation): reservation is LocalTransferExamReservation =>
        !reservation.enrolment || _.isObject(reservation.enrolment.externalExam);
    private isRemoteTransfer = (reservation: AnyReservation): reservation is RemoteTransferExamReservation =>
        _.isObject(reservation.externalReservation);
    private isCollaborative = (reservation: AnyReservation): reservation is CollaborativeExamReservation =>
        _.isObject(reservation.enrolment.collaborativeExam);

    query() {
        if (this.somethingSelected(this.selection as Params)) {
            const params = this.createParams(this.selection);
            this.http
                .get<Reservation[]>('/app/reservations', { params: params })
                .pipe(
                    map((reservations: Reservation[]) =>
                        reservations.map(r => ({
                            ...r,
                            userAggregate: r.user
                                ? `${r.user.lastName}  ${r.user.firstName}`
                                : r.externalUserRef
                                ? r.externalUserRef
                                : r.enrolment.exam.id.toString(),
                            org: '',
                            stateOrd: 0,
                            enrolment: { ...r.enrolment, teacherAggregate: '' },
                        })),
                    ),
                    map((reservations: AnyReservation[]) => {
                        // Transfer exams taken here
                        reservations.filter(this.isLocalTransfer).forEach((r: LocalTransferExamReservation) => {
                            r.enrolment = r.enrolment || {};
                            const state =
                                r.enrolment.externalExam && r.enrolment.externalExam.finished
                                    ? 'EXTERNAL_FINISHED'
                                    : 'EXTERNAL_UNFINISHED';
                            r.enrolment.exam = {
                                id: r.enrolment.externalExam.id,
                                external: true,
                                examOwners: [],
                                state: state,
                                parent: null,
                            };
                        });
                        // Transfer exams taken elsewhere
                        reservations.filter(this.isRemoteTransfer).forEach((r: RemoteTransferExamReservation) => {
                            if (r.externalReservation) {
                                r.org = { name: r.externalReservation.orgName, code: r.externalReservation.orgCode };
                                r.machine = {
                                    name: r.externalReservation.machineName,
                                    room: { name: r.externalReservation.roomName },
                                };
                            }
                        });
                        // Collaborative exams
                        reservations.filter(this.isCollaborative).forEach(r => {
                            if (!r.enrolment.exam) {
                                r.enrolment.exam = { ...r.enrolment.collaborativeExam, examOwners: [], parent: null };
                            } else {
                                r.enrolment.exam.examOwners = [];
                            }
                        });

                        return reservations;
                    }),
                    map((reservations: AnyReservation[]) => reservations.filter(r => r.enrolment.exam)),
                    map((reservations: AnyReservation[]) => {
                        reservations.forEach(r => {
                            const exam = r.enrolment.exam.parent || r.enrolment.exam;
                            r.enrolment.teacherAggregate = exam.examOwners.map(o => o.lastName + o.firstName).join();
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
                        });
                        return reservations;
                    }),
                )
                .subscribe(
                    reservations => {
                        this.reservations = reservations.filter(
                            r => r.externalReservation || !this.externalReservationsOnly,
                        );
                    },
                    err => toast.error(err),
                );
        }
    }

    isAdminView = () => this.user.isAdmin;

    private initOptions() {
        this.http.get<{ id: number; name: string }[]>('/app/reservations/students').subscribe(
            resp => {
                const students: (User & { name: string })[] = this.orderPipe.transform(resp, ['lastName', 'firstName']);
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
                    const teachers: (User & { name: string })[] = this.orderPipe.transform(resp, [
                        'lastName',
                        'firstName',
                    ]);
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
                const filteredExams: (Exam & { name: string })[] = this.orderPipe.transform(exams, 'name');
                this.examOptions = filteredExams.map(e => {
                    return { id: e.id, value: e, label: e.name };
                });
            }),
        );
    }

    private roomContains = (room: ExamRoom, machine: ExamMachine) => room.examMachines.some(m => m.id === machine.id);

    private machinesForRoom(room: ExamRoom, machines: ExamMachine[]): Option[] {
        if (room.examMachines.length < 1) {
            return [];
        }
        const header: Option = {
            id: undefined,
            label: room.name,
            isHeader: true,
        };
        const machineData: Option[] = machines
            .filter(m => this.roomContains(room, m))
            .map(m => {
                return { id: m.id, value: m, label: m.name == null ? '' : m.name };
            });
        machineData.unshift(header);
        return machineData;
    }

    private machinesForRooms = (rooms: ExamRoom[], machines: ExamMachine[]): Option[] =>
        rooms.map(r => this.machinesForRoom(r, machines)).reduce((a, b) => a.concat(b), []);

    roomChanged(room?: ExamRoom) {
        if (room === undefined) {
            delete this.selection.roomId;
            this.machineOptions = this.machinesForRooms(this.rooms, this.machines);
        } else {
            this.selection.roomId = room.id;
            this.machineOptions = this.machinesForRoom(room, this.machines);
        }
        this.query();
    }

    startDateChanged(date: Date) {
        this.startDate = date;
        this.query();
    }

    endDateChanged(date: Date) {
        this.endDate = date;
        this.query();
    }

    externalReservationFilterClicked() {
        this.query();
    }

    private somethingSelected(params: Params) {
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

    ownerChanged(owner: User) {
        this.selection.ownerId = owner ? owner.id : undefined;
        this.query();
    }

    stateChanged(state: string) {
        this.selection.state = state;
        this.query();
    }

    studentChanged(student: User) {
        this.selection.studentId = student ? student.id : undefined;
        this.query();
    }

    machineChanged(machine: ExamMachine) {
        this.selection.machineId = machine ? machine.id : undefined;
        this.query();
    }

    examChanged(exam: Exam) {
        this.selection.examId = exam.id.toString();
        this.query();
    }
}
