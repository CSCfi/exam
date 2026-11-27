// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
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
    template: `
        <div class="reservation-confirm">
            <section
                class="xm-stack xm-gap-2 reservation-confirm-panel"
                [class.reservation-confirm-panel--pending]="!reservation()"
                [class.xm-study-item-container]="reservation()"
                [class.xm-study-item-container--inactive]="!reservation()"
            >
                <header class="xm-split">
                    <h2 class="calendar-phase-title">
                        {{ sequenceNumber() }}. {{ 'i18n_calendar_phase_3' | translate }}
                    </h2>
                    <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" [hidden]="!reservation()" />
                </header>
                @if (!reservation()) {
                    <p class="reservation-confirm-pending-hint small xm-text-muted" role="status">
                        {{ 'i18n_calendar_reservation_pending_hint' | translate }}
                    </p>
                }
                <p class="calendar-course-title">{{ examInfo().name }}</p>
                <dl class="xm-details calendar-details">
                    <dt>{{ 'i18n_course_name' | translate }}:</dt>
                    <dd>
                        @if (examInfo().course) {
                            <xm-course-code [course]="examInfo().course"></xm-course-code>
                            {{ examInfo().course.name }}
                        }
                    </dd>
                    <dt>{{ 'i18n_exam_validity' | translate }}:</dt>
                    <dd>
                        {{ examInfo().periodStart | date: 'dd.MM.yyyy' }} -
                        {{ examInfo().periodEnd | date: 'dd.MM.yyyy' }}
                    </dd>
                    <dt>{{ 'i18n_examination_location' | translate }}:</dt>
                    <dd>{{ reservation()?.room?.name }}</dd>
                    <dt>{{ 'i18n_reservation' | translate }}:</dt>
                    <dd>{{ reservation()?.time }}</dd>
                    <dt>{{ 'i18n_exam_duration' | translate }}:</dt>
                    <dd>{{ printExamDuration(examInfo()) }}</dd>
                </dl>
            </section>
            <div class="xm-stack xm-gap-2">
                <button
                    type="button"
                    [disabled]="!reservation() || confirming()"
                    class="btn btn-lg btn-success important-clear-focus reservation-confirm-btn"
                    (click)="confirmClick.emit()"
                >
                    {{ 'i18n_student_confirm_reservation' | translate }}
                </button>
                <button
                    type="button"
                    class="btn btn-lg btn-outline-secondary reservation-confirm-btn"
                    (click)="cancelClick.emit()"
                >
                    {{ 'i18n_button_cancel' | translate }}
                </button>
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
