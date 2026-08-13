// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamInfo } from 'src/app/calendar/calendar.model';
import type { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';

export type CalendarReservationChoice = {
    room: ExamRoom;
    start: DateTime;
    end: DateTime;
    time: string;
    accessibilities: Accessibility[];
};

@Component({
    selector: 'xm-calendar-reservation-confirmation',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row mb-4">
            <div class="col-md-8 col-12 p-0">
                <div
                    class="row m-2 reservation-confirm-panel"
                    [class.reservation-confirm-panel--pending]="!reservation()"
                    [class.xm-study-item-container]="reservation()"
                    [class.xm-study-item-container--inactive]="!reservation()"
                >
                    <div class="col-md-12">
                        <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <h2 class="calendar-phase-title mb-0">
                                {{ sequenceNumber() }}. {{ 'i18n_calendar_phase_3' | translate }}
                            </h2>
                            <span class="calendar-phase-icon flex-shrink-0" [hidden]="!reservation()">
                                <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                            </span>
                        </div>
                        @if (!reservation()) {
                            <p class="reservation-confirm-pending-hint mb-2 small text-muted" role="status">
                                {{ 'i18n_calendar_reservation_pending_hint' | translate }}
                            </p>
                        }
                        <div class="row">
                            <div class="col-md-12">
                                <div class="calendar-titles">
                                    <span class="calendar-course-title">{{ examInfo().name }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-2 g-2">
                            <div class="col-12">
                                <div
                                    class="d-flex flex-column flex-sm-row flex-sm-wrap align-items-sm-baseline gap-1 gap-sm-2 min-w-0"
                                >
                                    <span class="reservation-confirm-label flex-shrink-0"
                                        >{{ 'i18n_course_name' | translate }}:</span
                                    >
                                    <span class="text-break min-w-0">
                                        @if (examInfo().course) {
                                            <xm-course-code [course]="examInfo().course"></xm-course-code>
                                            {{ examInfo().course.name }}
                                        }
                                    </span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div
                                    class="d-flex flex-column flex-sm-row flex-sm-wrap align-items-sm-baseline gap-1 gap-sm-2 min-w-0"
                                >
                                    <span class="reservation-confirm-label flex-shrink-0"
                                        >{{ 'i18n_exam_validity' | translate }}:</span
                                    >
                                    <span class="text-break min-w-0">
                                        {{ examInfo().periodStart | date: 'dd.MM.yyyy' }} -
                                        {{ examInfo().periodEnd | date: 'dd.MM.yyyy' }}
                                    </span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div
                                    class="d-flex flex-column flex-sm-row flex-sm-wrap align-items-sm-baseline gap-1 gap-sm-2 min-w-0"
                                >
                                    <span class="reservation-confirm-label flex-shrink-0"
                                        >{{ 'i18n_examination_location' | translate }}:</span
                                    >
                                    <span class="text-break min-w-0">{{ reservation()?.room?.name }}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div
                                    class="d-flex flex-column flex-sm-row flex-sm-wrap align-items-sm-baseline gap-1 gap-sm-2 min-w-0"
                                >
                                    <span class="reservation-confirm-label flex-shrink-0"
                                        >{{ 'i18n_reservation' | translate }}:</span
                                    >
                                    <span class="text-break min-w-0">{{ reservation()?.time }}</span>
                                </div>
                            </div>
                            <div class="col-12">
                                <div
                                    class="d-flex flex-column flex-sm-row flex-sm-wrap align-items-sm-baseline gap-1 gap-sm-2 min-w-0"
                                >
                                    <span class="reservation-confirm-label flex-shrink-0"
                                        >{{ 'i18n_exam_duration' | translate }}:</span
                                    >
                                    <span class="text-break min-w-0">{{ printExamDuration(examInfo()) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-12 p-0">
                <div class="row m-2 align-items-center">
                    <div class="col-md-12">
                        <button
                            type="button"
                            [disabled]="!reservation() || confirming()"
                            class="btn btn-lg btn-success float-end important-clear-focus w-100 reservation-confirm-btn"
                            (click)="confirmClick.emit()"
                        >
                            {{ 'i18n_student_confirm_reservation' | translate }}
                        </button>
                    </div>
                </div>
                <div class="row m-2 align-items-center">
                    <div class="col-md-12">
                        <button
                            type="button"
                            class="btn btn-lg btn-outline-secondary float-end w-100 reservation-confirm-btn"
                            (click)="cancelClick.emit()"
                        >
                            {{ 'i18n_button_cancel' | translate }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styleUrls: ['./reservation-confirmation.component.scss', '../calendar.component.scss'],
    imports: [CourseCodeComponent, DatePipe, TranslateModule],
})
export class ReservationConfirmationComponent {
    readonly sequenceNumber = input.required<number>();
    readonly examInfo = input.required<ExamInfo>();
    readonly reservation = input<CalendarReservationChoice | undefined>();
    readonly confirming = input(false);

    readonly confirmClick = output<void>();
    readonly cancelClick = output<void>();

    private readonly dateTimeService = inject(DateTimeService);

    printExamDuration(exam: ExamInfo): string {
        return this.dateTimeService.formatDuration(exam.duration);
    }
}
