// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { endOfDay, startOfDay } from 'date-fns';
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
            this.Reservation.listReservations$(params).subscribe({
                next: (reservations) => {
                    this.reservations = reservations
                        .filter((r) => r.externalReservation || !this.externalReservationsOnly)
                        .filter(
                            (r) =>
                                (!r.externalUserRef && (r.enrolment.exam as ExamImpl).implementation !== 'AQUARIUM') ||
                                !this.byodExamsOnly,
                        );
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    isAdminView = () => this.user.isAdmin;

    isSupportView = () => this.user.isSupport;

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

    protected searchStudents$ = (text$: Observable<string>) => this.Reservation.searchStudents$(text$);

    protected searchOwners$ = (text$: Observable<string>) => this.Reservation.searchOwners$(text$);

    protected searchExams$ = (text$: Observable<string>) =>
        this.Reservation.searchExams$(text$, this.isInteroperable && this.isAdminView());

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
