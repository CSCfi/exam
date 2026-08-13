// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { CollaborativeExam, Exam, ExamImpl } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { ReservationDetailsComponent } from './reservation-details.component';
import type { AnyReservation, ExamMachine, ExamRoom } from './reservation.model';
import { ReservationService, Selection } from './reservation.service';

@Component({
    selector: 'xm-reservations',
    imports: [
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationsComponent {
    readonly studentInput = viewChild.required<ElementRef>('studentInput');
    readonly examInput = viewChild.required<ElementRef>('examInput');
    readonly ownerInput = viewChild.required<ElementRef>('ownerInput');

    readonly examId = signal('');
    readonly externalRef = signal('');
    readonly student = signal<User | undefined>(undefined);
    readonly owner = signal<User | undefined>(undefined);
    readonly startDate = signal<Date | null>(new Date());
    readonly endDate = signal<Date | null>(new Date());
    readonly selection = signal<Selection>({});
    readonly stateOptions = signal<Option<string, string>[]>([]);
    readonly roomOptions = signal<Option<ExamRoom, number>[]>([]);
    readonly machineOptions = signal<Option<ExamMachine, number>[]>([]);
    readonly rooms = signal<ExamRoom[]>([]);
    readonly machines = signal<ExamMachine[]>([]);
    readonly reservations = signal<AnyReservation[]>([]);
    readonly isInteroperable = signal(false);
    readonly externalReservationsOnly = signal(false);
    readonly byodExamsOnly = signal(false);
    readonly isAdminView: boolean;
    readonly isSupportView: boolean;

    private readonly isInteroperable$ = toObservable(this.isInteroperable);

    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastrService);
    private readonly Session = inject(SessionService);
    private readonly Reservation = inject(ReservationService);

    constructor() {
        const user = this.Session.getUser();
        this.isAdminView = user.isAdmin ?? false;
        this.isSupportView = user.isSupport ?? false;

        const baseStates = [
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

        const examStates =
            this.isAdminView || this.isSupportView
                ? [...baseStates, 'EXTERNAL_UNFINISHED', 'EXTERNAL_FINISHED']
                : baseStates;

        const examIdParam = this.route.snapshot.params.eid;
        if (examIdParam) {
            this.examId.set(examIdParam);
        }
        this.initOptions();
        this.query();
        this.stateOptions.set(
            examStates.map((s) => ({
                id: s,
                value: s,
                label: `i18n_exam_status_${s.toLowerCase()}`,
            })),
        );
    }

    onExternalReservationsChange = (event: Event) => {
        this.externalReservationsOnly.set((event.target as HTMLInputElement).checked);
        this.query();
    };

    onByodExamsChange = (event: Event) => {
        this.byodExamsOnly.set((event.target as HTMLInputElement).checked);
        this.query();
    };

    query() {
        const currentSelection = this.selection();
        if (this.isSomethingSelected(currentSelection)) {
            const params = this.createParams(currentSelection);
            this.Reservation.listReservations$(params).subscribe({
                next: (reservations) => {
                    const filtered = reservations
                        .filter((r) => r.externalReservation || !this.externalReservationsOnly())
                        .filter(
                            (r) =>
                                (!r.externalUserRef && (r.enrolment.exam as ExamImpl).implementation !== 'AQUARIUM') ||
                                !this.byodExamsOnly(),
                        );
                    this.reservations.set(filtered);
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    studentSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.student.set(event.item);
        this.query();
    }

    clearStudent() {
        this.student.set(undefined);
        this.studentInput().nativeElement.value = '';
        this.query();
    }

    ownerSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.owner.set(event.item);
        this.query();
    }

    clearOwner() {
        this.owner.set(undefined);
        this.ownerInput().nativeElement.value = '';
        this.query();
    }

    examSelected(event: NgbTypeaheadSelectItemEvent<Exam | CollaborativeExam>) {
        if (event.item.externalRef) {
            this.externalRef.set(event.item.externalRef);
            this.examId.set('');
        } else {
            this.examId.set(event.item.id.toString());
            this.externalRef.set('');
        }
        this.query();
    }

    clearExam() {
        this.examId.set('');
        this.externalRef.set('');
        this.examInput().nativeElement.value = '';
        this.query();
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
        this.query();
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
        this.query();
    }

    roomChanged(event: Option<ExamRoom, number> | undefined) {
        const currentSelection = this.selection();
        const currentRooms = this.rooms();
        const currentMachines = this.machines();
        if (event?.value === undefined) {
            this.selection.set(this.omitProperty(currentSelection, 'roomId'));
            this.machineOptions.set(this.Reservation.machinesForRooms(currentRooms, currentMachines));
        } else {
            this.selection.set({ ...currentSelection, roomId: event.value.id.toString() });
            this.machineOptions.set(this.Reservation.machinesForRoom(event.value, currentMachines));
        }
        this.query();
    }

    stateChanged(event: Option<string, string> | undefined) {
        const currentSelection = this.selection();
        if (event?.value) {
            this.selection.set({ ...currentSelection, state: event.value });
        } else {
            this.selection.set(this.omitProperty(currentSelection, 'state'));
        }
        this.query();
    }

    machineChanged(event: Option<ExamMachine, number> | undefined) {
        const currentSelection = this.selection();
        if (event?.value) {
            this.selection.set({ ...currentSelection, machineId: event.value.id.toString() });
        } else {
            this.selection.set(this.omitProperty(currentSelection, 'machineId'));
        }
        this.query();
    }

    protected searchStudents$ = (text$: Observable<string>) => this.Reservation.searchStudents$(text$);

    protected searchOwners$ = (text$: Observable<string>) => this.Reservation.searchOwners$(text$);

    protected searchExams$ = (text$: Observable<string>) =>
        combineLatest([text$, this.isInteroperable$]).pipe(
            switchMap(([text, isInteroperable]) =>
                this.Reservation.searchExams$(of(text), isInteroperable && (this.isAdminView || this.isSupportView)),
            ),
        );

    protected nameFormatter = (item: { name: string }) => item.name;

    private createParams(input: Selection) {
        const currentStudent = this.student();
        const currentOwner = this.owner();
        const currentExamId = this.examId();
        const currentExternalRef = this.externalRef();
        const currentStartDate = this.startDate();
        const currentEndDate = this.endDate();
        const extras = {
            ...(currentStudent?.id && { studentId: currentStudent.id.toString() }),
            ...(currentOwner?.id && { ownerId: currentOwner.id.toString() }),
            ...(currentExamId && { examId: currentExamId }),
            ...(currentExternalRef && { externalRef: currentExternalRef }),
        };
        const params: Selection = { ...input, ...extras };
        if (currentStartDate) {
            params.start = DateTime.fromJSDate(currentStartDate).startOf('day').toISO() || '';
        }
        if (currentEndDate) {
            params.end = DateTime.fromJSDate(currentEndDate).endOf('day').toISO() || '';
        }
        return params;
    }

    private initOptions() {
        this.Reservation.getInteropSetting$().subscribe((resp) => {
            this.isInteroperable.set(resp.isExamVisitSupported);
        });

        if (this.isAdminView || this.isSupportView) {
            forkJoin({ rooms: this.Reservation.getExamRooms$(), machines: this.Reservation.getMachines$() }).subscribe({
                next: ({ rooms, machines }) => {
                    this.rooms.set(rooms);
                    this.machines.set(machines);
                    this.roomOptions.set(rooms.map((r) => ({ id: r.id, value: r, label: r.name })));
                    this.machineOptions.set(this.Reservation.machinesForRooms(rooms, machines));
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    private isSomethingSelected(params: Selection) {
        const currentStudent = this.student();
        const currentOwner = this.owner();
        const currentExamId = this.examId();
        const currentExternalRef = this.externalRef();
        const currentStartDate = this.startDate();
        const currentEndDate = this.endDate();
        if (currentStudent || currentOwner) return true;
        if (currentExamId || currentExternalRef) return true;
        if (Object.keys(params).length > 0) return true;
        return !!currentStartDate || !!currentEndDate;
    }

    private omitProperty<T extends Record<string, unknown>>(obj: T, key: keyof T): Omit<T, typeof key> {
        return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key)) as Omit<T, typeof key>;
    }
}
