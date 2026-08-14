// SPDX-FileCopyrightText: 2026 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NgbDropdownModule, NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import type { CollaborativeExam, Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { ReservationService, Selection } from 'src/app/reservation/reservation.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

interface ReportRow {
    firstName: string;
    lastName: string;
    studentEmail: string;
    eppn: string;
    studentNumber: string;
    courseCode: string;
    courseName: string;
    examName: string;
    teachers: string;
    reservationStart: string;
    reservationEnd: string;
    participationStart: string;
    participationEnd: string;
    participationDuration: string;
    assessmentStatus: string;
    gradeScale: string;
    grade: string;
    assessmentDateEstimated: string;
    assessmentDateLocked: string;
    additionalInfo: string;
    examId: string;
    score: string;
    maxScore: string;
    language: string;
    organisation: string;
    examType: string;
    examMethod: string;
    noShow: string;
    aborted: string;
}

@Component({
    selector: 'xm-reports-v2',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NgbTypeaheadModule,
        NgbDropdownModule,
        DatePickerComponent,
        DropdownSelectComponent,
        PageHeaderComponent,
        PageContentComponent,
    ],
    templateUrl: './reports-v2.component.html',
    styleUrl: './reports-v2.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsV2Component {
    readonly studentInput = viewChild.required<ElementRef>('studentInput');
    readonly examInput = viewChild.required<ElementRef>('examInput');
    readonly teacherInput = viewChild.required<ElementRef>('teacherInput');

    readonly student = signal<User | undefined>(undefined);
    readonly exam = signal<Exam | CollaborativeExam | undefined>(undefined);
    readonly teacher = signal<User | undefined>(undefined);
    readonly startDate = signal<Date | null>(null);
    readonly endDate = signal<Date | null>(null);
    readonly implementation = signal('');
    readonly status = signal('');
    readonly examType = signal('');
    readonly eppn = signal('');
    readonly studentNumber = signal('');
    readonly email = signal('');
    readonly visibleColumns = signal<string[]>([]);
    readonly sortColumn = signal<keyof ReportRow | undefined>(undefined);
    readonly sortDirection = signal<'asc' | 'desc'>('asc');

    readonly statusOptions = signal<Option<string, string>[]>([]);
    readonly columnOptions = signal<Option<string, string>[]>([]);
    readonly reportData = signal<ReportRow[]>([]);

    readonly sortedReportData = computed(() => {
        const data = this.reportData();
        const column = this.sortColumn();
        const direction = this.sortDirection();

        if (!column) {
            return data;
        }

        return [...data].sort((a, b) => {
            const valA = a[column] ?? '';
            const valB = b[column] ?? '';

            if (valA < valB) {
                return direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    });

    private readonly Reservation = inject(ReservationService);
    private readonly CommonExam = inject(CommonExamService);

    constructor() {
        const statuses = [
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

        this.statusOptions.set(
            statuses.map((s) => ({
                id: s,
                value: s,
                label: `i18n_exam_status_${s.toLowerCase()}`,
            })),
        );

        const columns = [
            { id: 'firstName', label: 'i18n_firstname' },
            { id: 'lastName', label: 'i18n_lastname' },
            { id: 'studentEmail', label: 'i18n_email' },
            { id: 'eppn', label: 'i18n_eppn' },
            { id: 'studentNumber', label: 'i18n_student_number' },
            { id: 'courseCode', label: 'i18n_course_code' },
            { id: 'courseName', label: 'i18n_course_name' },
            { id: 'examName', label: 'i18n_exam_name' },
            { id: 'teachers', label: 'i18n_exam_owners' },
            { id: 'reservationStart', label: 'i18n_reservation_start' },
            { id: 'reservationEnd', label: 'i18n_reservation_end' },
            { id: 'participationStart', label: 'i18n_participation_start' },
            { id: 'participationEnd', label: 'i18n_participation_end' },
            { id: 'participationDuration', label: 'i18n_participation_duration' },
            { id: 'assessmentStatus', label: 'i18n_exam_state' },
            { id: 'gradeScale', label: 'i18n_grade_scale' },
            { id: 'grade', label: 'i18n_grade' },
            { id: 'assessmentDateEstimated', label: 'i18n_assessment_date_estimated' },
            { id: 'assessmentDateLocked', label: 'i18n_assessment_date_locked' },
            { id: 'examId', label: 'i18n_exam_id' },
            { id: 'score', label: 'i18n_total_score' },
            { id: 'maxScore', label: 'i18n_max_score' },
            { id: 'language', label: 'i18n_language' },
            { id: 'organisation', label: 'i18n_faculty_name' },
            { id: 'additionalInfo', label: 'i18n_additional_info' },
            { id: 'examType', label: 'i18n_exam_type' },
            { id: 'examMethod', label: 'i18n_exam_method' },
            { id: 'noShow', label: 'i18n_no_show' },
            { id: 'aborted', label: 'i18n_aborted' },
        ];

        this.columnOptions.set(columns);
        this.visibleColumns.set(columns.map((c) => c.id));

        combineLatest([
            toObservable(this.student),
            toObservable(this.exam),
            toObservable(this.teacher),
            toObservable(this.startDate),
            toObservable(this.endDate),
            toObservable(this.implementation),
            toObservable(this.status),
            toObservable(this.examType),
            toObservable(this.eppn),
            toObservable(this.studentNumber),
            toObservable(this.email),
        ])
            .pipe(
                debounceTime(300),
                switchMap(() => {
                    if (!this.isAnyFilterActive()) {
                        this.reportData.set([]);
                        return of([]);
                    }

                    const currentStudent = this.student();
                    const currentExam = this.exam();
                    const currentTeacher = this.teacher();
                    const currentStartDate = this.startDate();
                    const currentEndDate = this.endDate();
                    const currentStatus = this.status();
                    const currentEppn = this.eppn().toLowerCase();
                    const currentStudentNumber = this.studentNumber().toLowerCase();
                    const currentEmail = this.email().toLowerCase();

                    const params: Selection = {
                        ...(currentStudent?.id && { studentId: currentStudent.id.toString() }),
                        ...(currentTeacher?.id && { ownerId: currentTeacher.id.toString() }),
                        ...(currentExam?.id && { examId: currentExam.id.toString() }),
                        ...(currentStatus && { state: currentStatus }),
                    };

                    if (currentStartDate) {
                        params.start = DateTime.fromJSDate(currentStartDate).toISO() || '';
                    }
                    if (currentEndDate) {
                        params.end = DateTime.fromJSDate(currentEndDate).endOf('day').toISO() || '';
                    }

                    return this.Reservation.listReservations$(params).pipe(
                        map((reservations) => {
                            const implementationFilter = this.implementation().toLowerCase();
                            const examTypeFilter = this.examType().toLowerCase();

                            return reservations
                                .filter((r) => {
                                    const exam = (r.enrolment?.exam.parent || r.enrolment?.exam) as Exam;
                                    const matchImplementation =
                                        !implementationFilter ||
                                        exam.implementation?.toLowerCase().includes(implementationFilter);
                                    const matchExamType =
                                        !examTypeFilter ||
                                        exam.examType?.type?.toLowerCase().includes(examTypeFilter) ||
                                        exam.examType?.name?.toLowerCase().includes(examTypeFilter);

                                    const matchEppn = !currentEppn || r.user?.eppn?.toLowerCase().includes(currentEppn);
                                    const matchStudentNumber =
                                        !currentStudentNumber ||
                                        r.user?.userIdentifier?.toLowerCase().includes(currentStudentNumber);
                                    const matchEmail =
                                        !currentEmail || r.user?.email?.toLowerCase().includes(currentEmail);

                                    return (
                                        matchImplementation &&
                                        matchExamType &&
                                        matchEppn &&
                                        matchStudentNumber &&
                                        matchEmail
                                    );
                                })
                                .map((r) => {
                                    const exam = (r.enrolment?.exam.parent || r.enrolment?.exam) as Exam;
                                    const participation = r.participation;
                                    const enrolment = r.enrolment;

                                    return {
                                        firstName: r.user?.firstName ?? r.externalUserRef ?? '',
                                        lastName: r.user?.lastName ?? '',
                                        studentEmail: r.user?.email ?? '',
                                        eppn: r.user?.eppn ?? '',
                                        studentNumber: r.user?.userIdentifier ?? '',
                                        courseCode: exam.course?.code ?? '',
                                        courseName: exam.course?.name ?? '',
                                        examName: exam.name ?? '',
                                        teachers:
                                            exam.examOwners
                                                ?.map((o) => `${o.firstName} ${o.lastName} (${o.email})`)
                                                .join(', ') ?? '',
                                        reservationStart: r.startAt
                                            ? DateTime.fromISO(r.startAt).toFormat('yyyy-MM-dd HH:mm')
                                            : '',
                                        reservationEnd: r.endAt
                                            ? DateTime.fromISO(r.endAt).toFormat('yyyy-MM-dd HH:mm')
                                            : '',
                                        participationStart: participation?.started
                                            ? DateTime.fromISO(participation.started).toFormat('yyyy-MM-dd HH:mm')
                                            : '',
                                        participationEnd: participation?.ended
                                            ? DateTime.fromISO(participation.ended).toFormat('yyyy-MM-dd HH:mm')
                                            : '',
                                        participationDuration: participation?.duration ?? '',
                                        assessmentStatus: this.Reservation.printExamState(r),
                                        gradeScale: exam.gradeScale?.name ?? '',
                                        grade: exam.grade?.name
                                            ? this.CommonExam.getExamGradeDisplayName(exam.grade.name)
                                            : '',
                                        assessmentDateEstimated: '', // Not easily available in this object
                                        assessmentDateLocked: exam.gradedTime
                                            ? DateTime.fromJSDate(new Date(exam.gradedTime)).toFormat(
                                                  'yyyy-MM-dd HH:mm',
                                              )
                                            : '',
                                        examId: exam.id?.toString() ?? '',
                                        score: exam.totalScore?.toString() ?? '',
                                        maxScore: exam.maxScore?.toString() ?? '',
                                        language: exam.examLanguages?.map((l) => l.name).join(', ') ?? '',
                                        organisation: exam.organisations ?? '',
                                        additionalInfo: exam.additionalInfo ?? '',
                                        examType: exam.examType?.name ?? exam.examType?.type ?? '',
                                        examMethod: exam.executionType?.type ?? '', // e.g. ROOM, BYOD
                                        noShow: enrolment?.noShow ? 'Yes' : 'No',
                                        aborted: r.participation?.ended && r.status === 'ABORTED' ? 'Yes' : 'No',
                                    };
                                });
                        }),
                        catchError((err) => {
                            console.error('[DEBUG_LOG] Error fetching report data:', err);
                            return of([]);
                        }),
                    );
                }),
                takeUntilDestroyed(),
            )
            .subscribe((rows) => {
                this.reportData.set(rows);
            });
    }

    protected nameFormatter = (item: { name: string }) => item.name;

    protected isAnyFilterActive(): boolean {
        return (
            !!this.student() ||
            !!this.exam() ||
            !!this.teacher() ||
            !!this.implementation() ||
            !!this.status() ||
            !!this.examType() ||
            !!this.startDate() ||
            !!this.endDate() ||
            !!this.eppn() ||
            !!this.studentNumber() ||
            !!this.email()
        );
    }

    studentSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.student.set(event.item);
    }

    clearStudent() {
        this.student.set(undefined);
        this.studentInput().nativeElement.value = '';
    }

    examSelected(event: NgbTypeaheadSelectItemEvent<Exam | CollaborativeExam>) {
        this.exam.set(event.item);
    }

    clearExam() {
        this.exam.set(undefined);
        this.examInput().nativeElement.value = '';
    }

    teacherSelected(event: NgbTypeaheadSelectItemEvent<User & { name: string }>) {
        this.teacher.set(event.item);
    }

    clearTeacher() {
        this.teacher.set(undefined);
        this.teacherInput().nativeElement.value = '';
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    toggleColumn(columnId: string | undefined) {
        if (!columnId) return;
        const current = this.visibleColumns();
        if (current.includes(columnId)) {
            this.visibleColumns.set(current.filter((c) => c !== columnId));
        } else {
            this.visibleColumns.set([...current, columnId]);
        }
    }

    showAllColumns() {
        this.visibleColumns.set(this.columnOptions().map((c) => c.id || ''));
    }

    hideAllColumns() {
        this.visibleColumns.set([]);
    }

    sort(columnId: string) {
        const col = columnId as keyof ReportRow;
        if (this.sortColumn() === col) {
            this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            this.sortColumn.set(col);
            this.sortDirection.set('asc');
        }
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }

    stageChanged(event: Option<string, string> | undefined) {
        this.status.set(event?.value ?? '');
    }

    protected searchStudents$ = (text$: Observable<string>) => this.Reservation.searchStudents$(text$);

    protected searchExams$ = (text$: Observable<string>) => this.Reservation.searchExams$(text$, false);

    protected searchTeachers$ = (text$: Observable<string>) => this.Reservation.searchOwners$(text$);
}
