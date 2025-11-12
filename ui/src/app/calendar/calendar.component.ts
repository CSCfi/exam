// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { switchMap, tap } from 'rxjs/operators';
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
    minDate = signal(new Date());
    maxDate = signal(new Date());
    reservationWindowEndDate = signal<Date | undefined>(undefined);
    reservationWindowSize = signal(0);
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

        this.Calendar.getExamInfo$(this.isCollaborative(), this.examId())
            .pipe(
                tap((resp) => {
                    resp.examSections.sort((es1, es2) => es1.sequenceNumber - es2.sequenceNumber);
                    this.examInfo.set(resp);
                }),
                switchMap(() => this.Calendar.getReservationiWindowSize$()),
                tap((resp) => {
                    this.reservationWindowSize.set(resp.value);
                    const windowEndDate = DateTime.now().plus({ day: resp.value }).toJSDate();
                    this.reservationWindowEndDate.set(windowEndDate);
                    const examInfo = this.examInfo();
                    this.minDate.set(
                        [new Date(), new Date(examInfo.periodStart as string)].reduce((a, b) => (a > b ? a : b)),
                    );
                    this.maxDate.set(
                        [windowEndDate, new Date(examInfo.periodEnd as string)].reduce((a, b) => (a < b ? a : b)),
                    );
                }),
                switchMap(() => this.Calendar.getExamVisitSupportStatus$()),
                tap((resp) => this.isInteroperable.set(resp.isExamVisitSupported)),
                switchMap(() =>
                    // TODO: move to section selector
                    this.Calendar.getCurrentEnrolment$(this.examId()),
                ),
                tap((resp: ExamEnrolment | null) => this.prepareOptionalSections(resp)),
            )
            .subscribe();
    }

    hasOptionalSections(): boolean {
        return this.examInfo().examSections.some((es) => es.optional);
    }

    getSequenceNumber(area: string): number {
        const hasOptionalSections = this.hasOptionalSections();
        switch (area) {
            case 'info':
                return 1;
            case 'material':
                return 2;
            case 'organization':
                return hasOptionalSections ? 3 : 2;
            case 'room':
                if (this.isExternal() && hasOptionalSections) {
                    return 4;
                } else if (this.isExternal() || hasOptionalSections) {
                    return 3;
                } else {
                    return 2;
                }
            case 'confirmation':
                if (this.isExternal() && hasOptionalSections) {
                    return 5;
                } else if (this.isExternal() || hasOptionalSections) {
                    return 4;
                } else {
                    return 3;
                }
        }
        return 0;
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

    sectionSelectionOk(): boolean {
        return this.examInfo().examSections.some((es) => !es.optional || es.selected);
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
        examInfo.examSections
            .filter((es) => es.optional)
            .forEach((es) => {
                es.selected =
                    (data && data.optionalSections.map((os) => os.id).indexOf(es.id) > -1) ||
                    this.selectedSections()
                        .map((s) => parseInt(s))
                        .indexOf(es.id) > -1;
            });
        this.examInfo.set(examInfo);
    }
}
