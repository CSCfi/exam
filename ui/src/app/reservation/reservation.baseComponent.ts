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
import { Injectable } from '@angular/core';
import { UIRouterGlobals } from '@uirouter/core';
import { endOfDay, startOfDay } from 'date-fns';
import * as _ from 'lodash';
import * as moment from 'moment';
import { forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService } from '../session/session.service';
import { OrderByPipe } from '../utility/sorting/orderBy.pipe';
import { ReservationService } from './reservation.service';

import type { Observable } from 'rxjs';
import type { ExamEnrolment } from '../enrolment/enrolment.model';
import type { CollaborativeExam, Exam, Implementation } from '../exam/exam.model';
import type { User } from '../session/session.service';
import type { Option } from '../utility/select/dropDownSelect.component';
import type { ExamMachine, ExamRoom, Reservation } from './reservation.model';
interface Selection {
    [data: string]: string;
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
    exam: CollaborativeExam & { examOwners: User[]; parent: null; implementation: Implementation };
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

@Injectable()
export class ReservationComponentBase {
    examId: string;
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
        private routing: UIRouterGlobals,
        private orderPipe: OrderByPipe,
        private Session: SessionService,
        private Reservation: ReservationService,
    ) {
        this.examId = this.routing.params.eid;
        this.user = this.Session.getUser();

        if (this.user.isAdmin) {
            this.examStates.push('EXTERNAL_UNFINISHED');
            this.examStates.push('EXTERNAL_FINISHED');
        }
    }

    ngOnInit() {
        this.selection = this.examId ? { examId: this.examId } : {};
        this.initOptions();
        this.query();
        this.stateOptions = this.examStates.map((s) => {
            return { id: s, label: `sitnet_exam_status_${s.toLowerCase()}` };
        });
    }

    // TODO: check this out
    private createParams = (input: Selection) => {
        const params: Selection = { ...input };
        if (params.examId && !_.isNumber(parseInt(params.examId as string))) {
            params.externalRef = params.examId as string;
            delete params.examId;
        }
        if (this.startDate) {
            params.start = startOfDay(this.startDate).toISOString();
        }
        if (this.endDate) {
            params.end = endOfDay(this.endDate).toISOString();
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
        if (this.somethingSelected(this.selection)) {
            const params = this.createParams(this.selection);
            forkJoin([
                this.http.get<Reservation[]>('/app/reservations', { params: params }),
                this.http.get<ExamEnrolment[]>('/app/events', { params: params }),
            ])
                .pipe(
                    map(([reservations, enrolments]) => {
                        const events: Partial<Reservation>[] = enrolments.map((ee) => {
                            return {
                                user: ee.user,
                                enrolment: ee,
                                startAt: ee.examinationEventConfiguration?.examinationEvent.start,
                                endAt: moment(ee.examinationEventConfiguration?.examinationEvent.start)
                                    .add(ee.exam.duration, 'm')
                                    .toISOString(),
                            };
                        });
                        const allEvents: Partial<Reservation>[] = reservations;
                        return allEvents.concat(events);
                    }),
                    map((reservations: Reservation[]) =>
                        reservations.map((r) => ({
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
                                id: r.enrolment?.externalExam?.id as number,
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
                        reservations.filter(this.isCollaborative).forEach((r) => {
                            if (!r.enrolment.exam) {
                                r.enrolment.exam = {
                                    ...r.enrolment.collaborativeExam,
                                    examOwners: [],
                                    parent: null,
                                    implementation: 'AQUARIUM',
                                };
                            } else {
                                r.enrolment.exam.examOwners = [];
                            }
                        });

                        return reservations;
                    }),
                    map((reservations: AnyReservation[]) => reservations.filter((r) => r.enrolment.exam)),
                    map((reservations: AnyReservation[]) => {
                        reservations.forEach((r) => {
                            const exam = r.enrolment.exam.parent || r.enrolment.exam;
                            r.enrolment.teacherAggregate = exam.examOwners.map((o) => o.lastName + o.firstName).join();
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
                    (reservations) => {
                        this.reservations = reservations.filter(
                            (r) => r.externalReservation || !this.externalReservationsOnly,
                        );
                    },
                    (err) => toast.error(err),
                );
        }
    }

    isAdminView = () => this.user.isAdmin;

    private initOptions() {
        this.http.get<(User & { name: string })[]>('/app/reservations/students').subscribe(
            (resp) => {
                const students: (User & { name: string })[] = this.orderPipe.transform(resp, 'lastName');
                this.studentOptions = students.map((s) => {
                    return { id: s.id, value: s, label: s.name };
                });
            },
            (resp) => toast.error(resp.data),
        );
        this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit').subscribe((resp) => {
            this.isInteroperable = resp.isExamVisitSupported;
            this.initExamOptions();
        });

        if (this.isAdminView()) {
            this.http.get<(User & { name: string })[]>('/app/reservations/teachers').subscribe(
                (resp) => {
                    const teachers = this.orderPipe.transform(resp, 'lastName');
                    this.teacherOptions = teachers.map((t) => {
                        return { id: t.id, value: t, label: t.name };
                    });
                },
                (resp) => toast.error(resp.data),
            );

            this.http.get<ExamRoom[]>('/app/reservations/examrooms').subscribe(
                (resp) => {
                    this.rooms = this.orderPipe.transform(resp, 'name');
                    this.roomOptions = this.rooms.map((r) => {
                        return { id: r.id, value: r, label: r.name };
                    });
                    this.http.get<ExamMachine[]>('/app/machines').subscribe((resp) => {
                        this.machines = this.orderPipe.transform(resp, 'name');
                        this.machineOptions = this.machinesForRooms(this.rooms, this.machines);
                    });
                },
                (err) => toast.error(err.data),
            );
        }
    }

    getPlaceHolder = () => (this.examId ? this.examOptions.find((o) => o.id == this.examId)?.label : '-');

    protected initExamOptions = () => {
        const examObservables: Observable<Exam[] | CollaborativeExam[]>[] = [
            this.http.get<Exam[]>('/app/reservations/exams'),
        ];
        if (this.isInteroperable && this.isAdminView()) {
            examObservables.push(this.http.get<CollaborativeExam[]>('/integration/iop/exams'));
        }
        forkJoin(examObservables)
            .pipe(
                map((exams) => exams.flat().flatMap((e) => ({ id: e.id, value: e, label: e.name }))),
                tap((options) => (this.examOptions = this.orderPipe.transform(options, 'label'))),
            )
            .subscribe();
    };

    private roomContains = (room: ExamRoom, machine: ExamMachine) => room.examMachines.some((m) => m.id === machine.id);

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
            .filter((m) => this.roomContains(room, m))
            .map((m) => {
                return { id: m.id, value: m, label: m.name == null ? '' : m.name };
            });
        machineData.unshift(header);
        return machineData;
    }

    private machinesForRooms = (rooms: ExamRoom[], machines: ExamMachine[]): Option[] =>
        rooms.map((r) => this.machinesForRoom(r, machines)).reduce((a, b) => a.concat(b), []);

    roomChanged(event?: { value: ExamRoom }) {
        if (event?.value === undefined) {
            delete this.selection.roomId;
            this.machineOptions = this.machinesForRooms(this.rooms, this.machines);
        } else {
            this.selection.roomId = event.value.id.toString();
            this.machineOptions = this.machinesForRoom(event.value, this.machines);
        }
        this.query();
    }

    startDateChanged(event: { date: Date }) {
        this.startDate = event.date;
        this.query();
    }

    endDateChanged(event: { date: Date }) {
        this.endDate = event.date;
        this.query();
    }

    externalReservationFilterClicked() {
        this.query();
    }

    private somethingSelected(params: Selection) {
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

    ownerChanged(event?: { value: User }) {
        if (event?.value) {
            this.selection.ownerId = event.value.id.toString();
        } else {
            delete this.selection.ownerId;
        }
        this.query();
    }

    stateChanged(event?: { value: string }) {
        if (event?.value) {
            this.selection.state = event.value;
        } else {
            delete this.selection.state;
        }
        this.query();
    }

    studentChanged(event?: { value: User }) {
        if (event?.value) {
            this.selection.studentId = event.value.id.toString();
        } else {
            delete this.selection.studentId;
        }
        this.query();
    }

    machineChanged(event?: { value: ExamMachine }) {
        if (event?.value) {
            this.selection.machineId = event.value.id.toString();
        } else {
            delete this.selection.machineId;
        }
        this.query();
    }

    examChanged(event?: { value: Exam }) {
        if (event?.value) {
            this.selection.examId = event.value.id.toString();
        } else {
            delete this.selection.examId;
        }
        this.query();
    }
}
