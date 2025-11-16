// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { ExamInfo, Organisation } from './calendar.model';
import { CalendarService } from './calendar.service';
import { CalendarExamInfoComponent } from './helpers/exam-info.component';
import { OptionalSectionsComponent } from './helpers/optional-sections.component';
import { OrganisationPickerComponent } from './helpers/organisation-picker.component';
import { SlotPickerComponent } from './helpers/slot-picker.component';

@Component({
    selector: 'xm-calendar',
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CalendarExamInfoComponent,
        OptionalSectionsComponent,
        OrganisationPickerComponent,
        SlotPickerComponent,
        NgClass,
        CourseCodeComponent,
        DatePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class CalendarComponent {
    isInteroperable = signal(false);
    confirming = signal(false);
    examInfo = signal<ExamInfo>({
        periodStart: null,
        periodEnd: null,
        name: '',
        duration: 0,
        anonymous: false,
        examSections: [],
        course: { code: '', name: '', id: 0, credits: 0 },
    });
    reservation = signal<
        | {
              room: ExamRoom;
              start: DateTime;
              end: DateTime;
              time: string;
              accessibilities: Accessibility[];
          }
        | undefined
    >(undefined);
    reservationWindowSize = signal(0);

    reservationWindowEndDate = computed(() =>
        this.reservationWindowSize() > 0
            ? DateTime.now().plus({ day: this.reservationWindowSize() }).toJSDate()
            : undefined,
    );

    minDate = computed(() => {
        const examInfo = this.examInfo();
        if (!examInfo.periodStart) return new Date();
        return [new Date(), new Date(examInfo.periodStart as string)].reduce((a, b) => (a > b ? a : b));
    });

    maxDate = computed(() => {
        const examInfo = this.examInfo();
        const windowEndDate = this.reservationWindowEndDate();
        if (!examInfo.periodEnd || !windowEndDate) return new Date();
        return [windowEndDate, new Date(examInfo.periodEnd as string)].reduce((a, b) => (a < b ? a : b));
    });

    sectionSelectionOk = computed(() => this.examInfo().examSections.some((es) => !es.optional || es.selected));

    selectedOrganisation = signal<Organisation | undefined>(undefined);
    examId = signal(0);
    selectedSections = signal<string[]>([]);
    isCollaborative = signal(false);
    isExternal = signal(false);

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private DateTimeService = inject(DateTimeService);
    private Dialog = inject(ConfirmationDialogService);
    private Calendar = inject(CalendarService);

    constructor() {
        if (
            this.route.snapshot.data.isCollaborative ||
            this.route.snapshot.queryParamMap.get('isCollaborative') === 'true'
        ) {
            this.isCollaborative.set(true);
        }
        this.examId.set(Number(this.route.snapshot.paramMap.get('id')));
        this.isExternal.set(this.route.snapshot.data.isExternal);
        this.selectedSections.set(this.route.snapshot.queryParamMap.getAll('selected'));

        forkJoin({
            examInfo: this.Calendar.getExamInfo$(this.isCollaborative(), this.examId()).pipe(
                map((resp) => {
                    resp.examSections.sort((es1, es2) => es1.sequenceNumber - es2.sequenceNumber);
                    return resp;
                }),
                catchError((err) => {
                    this.toast.error(err);
                    return of(this.examInfo());
                }),
            ),
            reservationWindowSize: this.Calendar.getReservationiWindowSize$().pipe(
                map((resp) => resp.value),
                catchError((err) => {
                    this.toast.error(err);
                    return of(0);
                }),
            ),
            isInteroperable: this.Calendar.getExamVisitSupportStatus$().pipe(
                map((resp) => resp.isExamVisitSupported),
                catchError((err) => {
                    this.toast.error(err);
                    return of(false);
                }),
            ),
            enrolment: this.Calendar.getCurrentEnrolment$(this.examId()).pipe(
                catchError((err) => {
                    this.toast.error(err);
                    return of(null);
                }),
            ),
        }).subscribe({
            next: ({ examInfo, reservationWindowSize, isInteroperable, enrolment }) => {
                this.examInfo.set(examInfo);
                this.reservationWindowSize.set(reservationWindowSize);
                this.isInteroperable.set(isInteroperable);
                this.prepareOptionalSections(enrolment);
            },
            error: (err) => this.toast.error(err),
        });
    }

    hasOptionalSections(): boolean {
        return this.examInfo().examSections.some((es) => es.optional);
    }

    getSequenceNumber(area: string): number {
        const hasOptional = this.hasOptionalSections();
        const ext = this.isExternal();

        const map: Record<string, number> = {
            info: 1,
            material: 2,
            organization: hasOptional ? 3 : 2,
            room: ext && hasOptional ? 4 : ext || hasOptional ? 3 : 2,
            confirmation: ext && hasOptional ? 5 : ext || hasOptional ? 4 : 3,
        };
        return map[area] ?? 0;
    }

    makeExternalReservation() {
        const url = 'https://e-exam.fi/exam-tenttivierailu/';

        const baseMessage = this.translate.instant('i18n_confirm_external_reservation');
        const linkText = this.translate.instant('i18n_external_reservation_link_text');
        const htmlContent = `${baseMessage}<br><a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;

        this.Dialog.open$(
            this.translate.instant('i18n_continue_to_external_reservation'),
            htmlContent,
            'i18n_continue',
            'i18n_go_back',
        ).subscribe({
            next: () => {
                const examInfo = this.examInfo();
                this.router.navigate(['/calendar', this.examId(), 'external'], {
                    queryParams: {
                        selected: examInfo.examSections.filter((es) => es.selected).map((es) => es.id),
                        isCollaborative: this.isCollaborative(),
                    },
                });
            },
        });
    }

    makeInternalReservation() {
        const examInfo = this.examInfo();
        const nextState = this.isCollaborative()
            ? ['/calendar', this.examId(), 'collaborative']
            : ['/calendar', this.examId()];
        this.router.navigate(nextState, {
            queryParams: { selected: examInfo.examSections.filter((es) => es.selected).map((es) => es.id) },
        });
    }

    cancel() {
        this.router.navigate(['/dashboard']);
    }

    createReservation($event: { start: string; end: string; room: ExamRoom; accessibilities: Accessibility[] }) {
        this.reservation.set({
            room: $event.room,
            time: `${this.asDateTime($event.start, $event.room.localTimezone).toFormat(
                'dd.MM.yyyy HH:mm',
            )} - ${this.asDateTime($event.end, $event.room.localTimezone).toFormat('HH:mm')}`,
            start: this.asDateTime($event.start, $event.room.localTimezone),
            end: this.asDateTime($event.end, $event.room.localTimezone),
            accessibilities: $event.accessibilities,
        });
    }

    onSectionSelection(event: { valid: boolean }) {
        // TODO: how to invalidate calendar
        if (!event.valid) {
            this.selectedOrganisation.set(undefined);
            // delete this.selectedRoom;
            this.reservation.set(undefined);
        }
    }

    confirmReservation() {
        const reservation = this.reservation();
        const room = reservation?.room;
        if (!room || !reservation || this.confirming()) {
            return;
        }
        const examInfo = this.examInfo();
        const selectedSectionIds = examInfo.examSections.filter((es) => es.selected).map((es) => es.id);
        if (!this.sectionSelectionOk()) {
            this.toast.error(this.translate.instant('i18n_select_at_least_one_section'));
            return;
        }
        this.confirming.set(true);
        this.Calendar.reserve$(
            this.examId(),
            reservation.start,
            reservation.end,
            room,
            reservation.accessibilities || [],
            { _id: this.selectedOrganisation() ? this.selectedOrganisation()!._id : null },
            this.isCollaborative(),
            selectedSectionIds,
        )
            .subscribe({
                next: () => this.router.navigate(['/dashboard']),
                error: (resp) => {
                    this.toast.error(resp);
                },
            })
            .add(() => this.confirming.set(false));
    }

    setOrganisation(org: Organisation) {
        this.selectedOrganisation.set(org);
    }

    printExamDuration(exam: ExamInfo) {
        return this.DateTimeService.formatDuration(exam.duration);
    }

    private asDateTime(date: string, tz: string): DateTime {
        return DateTime.fromISO(date, { zone: tz });
    }

    private prepareOptionalSections(data: ExamEnrolment | null) {
        const examInfo = this.examInfo();
        const updatedSections = examInfo.examSections.map((es) => {
            if (!es.optional) return es;
            return {
                ...es,
                selected:
                    data?.optionalSections.some((os) => os.id === es.id) ||
                    this.selectedSections().some((s) => Number(s) === es.id),
            };
        });
        this.examInfo.set({ ...examInfo, examSections: updatedSections });
    }
}
