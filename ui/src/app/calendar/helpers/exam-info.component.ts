// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamInfo } from 'src/app/calendar/calendar.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { RichTextDirective } from 'src/app/shared/rich-text/rich-text.directive';

@Component({
    selector: 'xm-calendar-exam-info',
    template: `
        <section class="xm-stack xm-gap-2 xm-study-item-container">
            <header class="xm-split">
                <h2 class="calendar-phase-title">1. {{ 'i18n_calendar_phase_1' | translate }}</h2>
                <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
            </header>
            <p>
                <span class="calendar-course-title">{{ examInfo().name }}</span>
                @if (examInfo().anonymous) {
                    <span>({{ 'i18n_anonymous_review' | translate }})</span>
                }
            </p>
            <dl class="xm-details calendar-details">
                <dt>{{ 'i18n_course_name' | translate }}:</dt>
                <dd>
                    @if (!collaborative() && examInfo().course) {
                        <xm-course-code [course]="examInfo().course"></xm-course-code>
                        {{ examInfo().course.name }}
                    }
                </dd>
                <dt>{{ 'i18n_exam_validity' | translate }}:</dt>
                <dd>
                    {{ examInfo().periodStart | date: 'dd.MM.yyyy' }} -
                    {{ examInfo().periodEnd | date: 'dd.MM.yyyy' }}
                </dd>
                <dt>{{ 'i18n_exam_duration' | translate }}:</dt>
                <dd>{{ printExamDuration(examInfo()) }}</dd>
            </dl>
            <dl class="calendar-details" [hidden]="examInfo().executionType?.type === 'MATURITY'">
                <dt>{{ 'i18n_calendar_instructions' | translate }}:</dt>
                <dd class="text-break m-0" [xmRichText]="examInfo().enrollInstruction"></dd>
            </dl>
            @if (showReservationWindowDescription()) {
                <p class="xm-info-link xm-cluster" role="note">
                    <img class="arrow_icon" src="/assets/images/icon_info.png" alt="" />
                    <span class="text-break">{{ reservationWindowDescription() }}</span>
                </p>
            }
        </section>
    `,
    styleUrls: ['../calendar.component.scss'],
    imports: [CourseCodeComponent, RichTextDirective, DatePipe, TranslateModule],
})
export class CalendarExamInfoComponent {
    readonly examInfo = input.required<ExamInfo>();
    readonly reservationWindowSize = input(0);
    readonly collaborative = input(false);

    readonly reservationWindowEndDate = computed(() =>
        DateTime.now().plus({ day: this.reservationWindowSize() }).toJSDate(),
    );
    readonly reservationWindowDescription = computed(() => {
        const text = this.translate
            .instant('i18n_description_reservation_window')
            .replace('{}', this.reservationWindowSize().toString());
        return `${text} (${DateTime.fromJSDate(this.reservationWindowEndDate()).toFormat('dd.MM.yyyy')})`;
    });
    readonly showReservationWindowDescription = computed(
        () => DateTime.fromISO(this.examInfo().periodEnd as string).toJSDate() > this.reservationWindowEndDate(),
    );

    private readonly translate = inject(TranslateService);
    private readonly DateTimeService = inject(DateTimeService);

    printExamDuration(info: ExamInfo) {
        return this.DateTimeService.formatDuration(info.duration);
    }
}
