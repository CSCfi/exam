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
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { addMinutes, endOfDay, parseISO, startOfDay } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { Observable, forkJoin, from, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';
import type { ExamEnrolment } from '../enrolment/enrolment.model';
import type { CollaborativeExam, Exam, ExamImpl, Implementation } from '../exam/exam.model';
import type { User } from '../session/session.service';
import { SessionService } from '../session/session.service';
import { PageContentComponent } from '../shared/components/page-content.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';
import { DatePickerComponent } from '../shared/date/date-picker.component';
import { isObject } from '../shared/miscellaneous/helpers';
import { DropdownSelectComponent, Option } from '../shared/select/dropdown-select.component';
import { OrderByPipe } from '../shared/sorting/order-by.pipe';
import { ReservationDetailsComponent } from './reservation-details.component';
import type { ExamMachine, ExamRoom, Reservation } from './reservation.model';
import { ReservationService } from './reservation.service';

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
export type AnyReservation =
    | ReservationDisplay
    | LocalTransferExamReservation
    | RemoteTransferExamReservation
    | CollaborativeExamReservation;

@Component({
    selector: 'xm-reservations',
    standalone: true,
    imports: [
        FormsModule,
        TranslateModule,
        NgbTypeaheadModule,
        DatePickerComponent,
        DropdownSelectComponent,
        ReservationDetailsComponent,
        PageHeaderComponent,
        PageContentComponent,
    ],
    templateUrl: './reservations.component.html',
    styleUrl: './reservations.component.scss',
})
export class ReservationsComponent implements OnInit {
    @ViewChild('studentInput') studentInput!: ElementRef;
    @ViewChild('examInput') examInput!: ElementRef;
    @ViewChild('ownerInput') ownerInput!: ElementRef;
    examId = '';
    externalRef = '';
    student?: User;
    owner?: User;
    startDate: Date | null = new Date();
    endDate: Date | null = new Date();
    user: User;
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
    selection: Selection = {};
    stateOptions: Option<string, string>[] = [];
    roomOptions: Option<ExamRoom, number>[] = [];
    machineOptions: Option<ExamMachine, number>[] = [];
    rooms: ExamRoom[] = [];
    machines: ExamMachine[] = [];
    reservations: AnyReservation[] = [];
    isInteroperable = false;
    externalReservationsOnly = false;
    byodExamsOnly = false;

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private toast: ToastrService,
        private orderPipe: OrderByPipe,
        private Session: SessionService,
        private Reservation: ReservationService,
    ) {
        this.user = this.Session.getUser();

        if (this.user.isAdmin) {
            this.examStates.push('EXTERNAL_UNFINISHED');
            this.examStates.push('EXTERNAL_FINISHED');
        }
    }

    ngOnInit() {
        this.examId = this.route.snapshot.params.eid;
        this.initOptions();
        this.query();
        this.stateOptions = this.examStates.map((s) => {
            return { id: s, value: s, label: `i18n_exam_status_${s.toLowerCase()}` };
        });
    }

    query() {
        if (this.somethingSelected(this.selection)) {
            const params = this.createParams(this.selection);
            // Do not fetch byod exams if machine id, room id or external ref in the query params.
            // Also applies if searching for external reservations
            const eventRequest =
                params.roomId || params.machineId || params.externalRef || params.state?.startsWith('EXTERNAL_')
                    ? of([])
                    : this.http.get<ExamEnrolment[]>('/app/events', { params: params });
            forkJoin([this.http.get<Reservation[]>('/app/reservations', { params: params }), eventRequest])
                .pipe(
                    map(([reservations, enrolments]) => {
                        const events: Partial<Reservation>[] = enrolments.map((ee) => {
                            return {
                                user: ee.user,
                                enrolment: ee,
                                startAt: ee.examinationEventConfiguration?.examinationEvent.start,
                                endAt: addMinutes(
                                    parseISO(ee.examinationEventConfiguration?.examinationEvent.start as string),
                                    ee.exam.duration,
                                ).toISOString(),
                            };
                        });
                        const allEvents: Partial<Reservation>[] = reservations;
                        return allEvents.concat(events) as Reservation[]; // FIXME: this is wrong(?) <- don't know how to model anymore with strict checking
                    }),
                    map((reservations: Reservation[]) =>
                        reservations.map((r) => ({
                            ...r,
                            userAggregate: r.user
                                ? `${r.user.lastName}  ${r.user.firstName}`
                                : r.externalUserRef
                                  ? r.externalUserRef
                                  : r.enrolment?.exam
                                    ? r.enrolment.exam.id.toString()
                                    : '',
                            org: '',
                            stateOrd: 0,
                            enrolment: r.enrolment ? { ...r.enrolment, teacherAggregate: '' } : r.enrolment,
                        })),
                    ),
                    map((reservations: AnyReservation[]) => {
                        // Transfer exams taken here
                        reservations.filter(this.isLocalTransfer).forEach((r: LocalTransferExamReservation) => {
                            const state = r.enrolment?.externalExam?.finished
                                ? 'EXTERNAL_FINISHED'
                                : 'EXTERNAL_UNFINISHED';
                            const enrolment: LocalTransferExamEnrolment = {
                                ...r.enrolment,
                                exam: {
                                    id: r.enrolment?.externalExam?.id as number,
                                    external: true,
                                    examOwners: [],
                                    state: state,
                                    parent: null,
                                },
                            };
                            r.enrolment = enrolment;
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
                    map((reservations: AnyReservation[]) => reservations.filter((r) => r.enrolment?.exam)),
                    map((reservations: AnyReservation[]) => {
                        reservations.forEach((r) => {
                            const exam = (r.enrolment?.exam.parent || r.enrolment?.exam) as Exam;
                            r.enrolment = {
                                ...(r.enrolment as ExamEnrolment),
                                teacherAggregate: exam.examOwners.map((o) => o.lastName + o.firstName).join(),
                            };
                            const state = this.Reservation.printExamState(r) as string;
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
                .subscribe({
                    next: (reservations) => {
                        this.reservations = reservations
                            .filter((r) => r.externalReservation || !this.externalReservationsOnly)
                            .filter(
                                (r) =>
                                    (!r.externalUserRef &&
                                        (r.enrolment.exam as ExamImpl).implementation !== 'AQUARIUM') ||
                                    !this.byodExamsOnly,
                            );
                    },
                    error: (err) => this.toast.error(err),
                });
        }
    }

    isAdminView = () => this.user.isAdmin;

    studentSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.student = event.item;
        this.query();
    }

    clearStudent() {
        delete this.student;
        this.studentInput.nativeElement.value = '';
        this.query();
    }

    ownerSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.owner = event.item;
        this.query();
    }

    clearOwner() {
        delete this.owner;
        this.ownerInput.nativeElement.value = '';
        this.query();
    }

    examSelected(event: NgbTypeaheadSelectItemEvent<Exam | CollaborativeExam>) {
        if (event.item.externalRef) {
            this.externalRef = event.item.externalRef;
            this.examId = '';
        } else {
            this.examId = event.item.id.toString();
            this.externalRef = '';
        }
        this.query();
    }

    clearExam() {
        this.examId = '';
        this.externalRef = '';
        this.examInput.nativeElement.value = '';
        this.query();
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate = event.date;
        this.query();
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate = event.date;
        this.query();
    }

    roomChanged(event: Option<ExamRoom, number> | undefined) {
        if (event?.value === undefined) {
            delete this.selection.roomId;
            this.machineOptions = this.machinesForRooms(this.rooms, this.machines);
        } else {
            this.selection.roomId = event.value.id.toString();
            this.machineOptions = this.machinesForRoom(event.value, this.machines);
        }
        this.query();
    }

    stateChanged(event: Option<string, string> | undefined) {
        if (event?.value) {
            this.selection.state = event.value;
        } else {
            delete this.selection.state;
        }
        this.query();
    }

    machineChanged(event: Option<ExamMachine, number> | undefined) {
        if (event?.value) {
            this.selection.machineId = event.value.id.toString();
        } else {
            delete this.selection.machineId;
        }
        this.query();
    }

    protected searchStudents$ = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2
                    ? from([])
                    : this.http.get<(User & { name: string })[]>('/app/reservations/students', {
                          params: { filter: term },
                      }),
            ),
            map((ss) => ss.sort((a, b) => a.firstName.localeCompare(b.firstName)).slice(0, 100)),
        );

    protected searchOwners$ = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) =>
                term.length < 2
                    ? from([])
                    : this.http.get<(User & { name: string })[]>('/app/reservations/teachers', {
                          params: { filter: term },
                      }),
            ),
            map((ss) => ss.sort((a, b) => a.lastName.localeCompare(b.lastName)).slice(0, 100)),
        );

    protected searchExams$ = (text$: Observable<string>) => {
        const listExams$ = (text: string) => {
            const examObservables: Observable<Exam[] | CollaborativeExam[]>[] = [
                this.http.get<Exam[]>('/app/reservations/exams', { params: { filter: text } }),
            ];
            if (this.isInteroperable && this.isAdminView()) {
                examObservables.push(
                    this.http.get<CollaborativeExam[]>('/app/iop/exams', { params: { filter: text } }),
                );
            }
            return forkJoin(examObservables).pipe(map((exams) => exams.flat()));
        };
        return text$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            exhaustMap((term) => (term.length < 2 ? from([]) : listExams$(term))),
            map((es) => es.sort((a, b) => (a.name as string).localeCompare(b.name as string)).slice(0, 100)),
        );
    };

    protected nameFormatter = (item: { name: string }) => item.name;

    private createParams = (input: Selection) => {
        const extras = {
            ...(this.student?.id && { studentId: this.student.id.toString() }),
            ...(this.owner?.id && { ownerId: this.owner.id.toString() }),
            ...(this.examId && { examId: this.examId }),
            ...(this.externalRef && { externalRef: this.externalRef }),
        };
        const params: Selection = { ...input, ...extras };
        if (this.startDate) {
            params.start = startOfDay(this.startDate).toISOString();
        }
        if (this.endDate) {
            params.end = endOfDay(this.endDate).toISOString();
        }
        return params;
    };

    // Transfer examination taking place here
    private isLocalTransfer = (reservation: AnyReservation): reservation is LocalTransferExamReservation =>
        !reservation.enrolment || isObject(reservation.enrolment.externalExam);
    // Transfer examination taking place elsewhere
    private isRemoteTransfer = (reservation: AnyReservation): reservation is RemoteTransferExamReservation =>
        isObject(reservation.externalReservation);
    private isCollaborative = (reservation: AnyReservation): reservation is CollaborativeExamReservation =>
        isObject(reservation.enrolment?.collaborativeExam);

    private initOptions() {
        this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit').subscribe((resp) => {
            this.isInteroperable = resp.isExamVisitSupported;
        });

        if (this.isAdminView()) {
            this.http.get<ExamRoom[]>('/app/reservations/examrooms').subscribe({
                next: (resp) => {
                    this.rooms = this.orderPipe.transform(resp, 'name');
                    this.roomOptions = this.rooms.map((r) => ({ id: r.id, value: r, label: r.name }));
                    this.http.get<ExamMachine[]>('/app/machines').subscribe((resp) => {
                        this.machines = this.orderPipe.transform(resp, 'name');
                        this.machineOptions = this.machinesForRooms(this.rooms, this.machines);
                    });
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    private machinesForRoom(room: ExamRoom, machines: ExamMachine[]): Option<ExamMachine, number>[] {
        if (room.examMachines.length < 1) {
            return [];
        }
        const header: Option<ExamMachine, number> = {
            id: undefined,
            label: room.name,
            isHeader: true,
        };
        const machineData: Option<ExamMachine, number>[] = machines
            .filter((m) => room.examMachines.some((rem) => m.id === rem.id))
            .map((m) => {
                return { id: m.id, value: m, label: m.name == null ? '' : m.name };
            });
        machineData.unshift(header);
        return machineData;
    }

    private machinesForRooms = (rooms: ExamRoom[], machines: ExamMachine[]): Option<ExamMachine, number>[] =>
        rooms.map((r) => this.machinesForRoom(r, machines)).reduce((a, b) => a.concat(b), []);

    private somethingSelected(params: Selection) {
        if (this.student || this.owner) return true;
        if (this.examId || this.externalRef) return true;
        if (Object.keys(params).length > 0) return true;
        return this.startDate || this.endDate;
    }
}
