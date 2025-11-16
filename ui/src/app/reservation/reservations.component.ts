// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import type { CollaborativeExam, Exam, ExamImpl } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { ReservationDetailsComponent } from './reservation-details.component';
import type { AnyReservation, ExamMachine, ExamRoom } from './reservation.model';
import { ReservationService, Selection } from './reservation.service';

@Component({
    selector: 'xm-reservations',
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationsComponent {
    @ViewChild('studentInput') studentInput!: ElementRef;
    @ViewChild('examInput') examInput!: ElementRef;
    @ViewChild('ownerInput') ownerInput!: ElementRef;

    examId = signal('');
    externalRef = signal('');
    student = signal<User | undefined>(undefined);
    owner = signal<User | undefined>(undefined);
    startDate = signal<Date | null>(new Date());
    endDate = signal<Date | null>(new Date());
    user: User;
    examStates: string[];
    selection = signal<Selection>({});
    stateOptions = signal<Option<string, string>[]>([]);
    roomOptions = signal<Option<ExamRoom, number>[]>([]);
    machineOptions = signal<Option<ExamMachine, number>[]>([]);
    rooms = signal<ExamRoom[]>([]);
    machines = signal<ExamMachine[]>([]);
    reservations = signal<AnyReservation[]>([]);
    isInteroperable = signal(false);
    externalReservationsOnly = signal(false);
    byodExamsOnly = signal(false);

    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private toast = inject(ToastrService);
    private orderPipe = inject(OrderByPipe);
    private Session = inject(SessionService);
    private Reservation = inject(ReservationService);

    constructor() {
        this.user = this.Session.getUser();

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

        if (this.user.isAdmin || this.user.isSupport) {
            this.examStates = [...baseStates, 'EXTERNAL_UNFINISHED', 'EXTERNAL_FINISHED'];
        } else {
            this.examStates = baseStates;
        }

        const examIdParam = this.route.snapshot.params.eid;
        if (examIdParam) {
            this.examId.set(examIdParam);
        }
        this.initOptions();
        this.query();
        this.stateOptions.set(
            this.examStates.map((s) => ({
                id: s,
                value: s,
                label: `i18n_exam_status_${s.toLowerCase()}`,
            })),
        );
    }

    query() {
        const currentSelection = this.selection();
        if (this.somethingSelected(currentSelection)) {
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

    isAdminView() {
        return this.user.isAdmin;
    }

    isSupportView() {
        return this.user.isSupport;
    }

    studentSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.student.set(event.item);
        this.query();
    }

    clearStudent() {
        this.student.set(undefined);
        this.studentInput.nativeElement.value = '';
        this.query();
    }

    ownerSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.owner.set(event.item);
        this.query();
    }

    clearOwner() {
        this.owner.set(undefined);
        this.ownerInput.nativeElement.value = '';
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
        this.examInput.nativeElement.value = '';
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
            this.machineOptions.set(this.machinesForRooms(currentRooms, currentMachines));
        } else {
            this.selection.set({ ...currentSelection, roomId: event.value.id.toString() });
            this.machineOptions.set(this.machinesForRoom(event.value, currentMachines));
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
        this.Reservation.searchExams$(text$, this.isInteroperable() && (this.isAdminView() || this.isSupportView()));

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
        this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit').subscribe((resp) => {
            this.isInteroperable.set(resp.isExamVisitSupported);
        });

        if (this.isAdminView()) {
            this.http.get<ExamRoom[]>('/app/reservations/examrooms').subscribe({
                next: (resp) => {
                    const orderedRooms = this.orderPipe.transform(resp, 'name');
                    this.rooms.set(orderedRooms);
                    this.roomOptions.set(orderedRooms.map((r) => ({ id: r.id, value: r, label: r.name })));
                    this.http.get<ExamMachine[]>('/app/machines').subscribe((resp) => {
                        const orderedMachines = this.orderPipe.transform(resp, 'name');
                        this.machines.set(orderedMachines);
                        this.machineOptions.set(this.machinesForRooms(orderedRooms, orderedMachines));
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
                return { id: m.id, value: m, label: m.name === null ? '' : m.name };
            });
        machineData.unshift(header);
        return machineData;
    }

    private machinesForRooms(rooms: ExamRoom[], machines: ExamMachine[]): Option<ExamMachine, number>[] {
        return rooms.map((r) => this.machinesForRoom(r, machines)).reduce((a, b) => a.concat(b), []);
    }

    private somethingSelected(params: Selection) {
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
