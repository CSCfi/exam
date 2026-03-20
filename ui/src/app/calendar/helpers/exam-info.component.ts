// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamInfo } from 'src/app/calendar/calendar.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';

@Component({
    selector: 'xm-calendar-exam-info',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row xm-study-item-container m-2 details-view">
            <div class="col-md-12">
                <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <h2 class="calendar-phase-title mb-0">1. {{ 'i18n_calendar_phase_1' | translate }}</h2>
                    <img
                        class="calendar-phase-icon arrow_icon flex-shrink-0"
                        src="/assets/images/icon-phase.png"
                        alt=""
                    />
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="calendar-titles">
                            <span class="calendar-course-title">{{ examInfo().name }}</span>
                            @if (examInfo().anonymous) {
                                <span>({{ 'i18n_anonymous_review' | translate }})</span>
                            }
                        </div>
                    </div>
                </div>
                <div class="row mt-2 g-2">
                    <div class="col-12">
                        <div
                            class="d-flex flex-column flex-sm-row flex-sm-wrap align-items-sm-baseline gap-1 gap-sm-2 min-w-0"
                        >
                            <span class="exam-info-label flex-shrink-0">{{ 'i18n_course_name' | translate }}:</span>
                            <span class="text-break min-w-0">
                                @if (!collaborative() && examInfo().course) {
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
                            <span class="exam-info-label flex-shrink-0">{{ 'i18n_exam_validity' | translate }}:</span>
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
                            <span class="exam-info-label flex-shrink-0">{{ 'i18n_exam_duration' | translate }}:</span>
                            <span class="text-break min-w-0">{{ printExamDuration(examInfo()) }}</span>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-12">
                        <div class="d-flex flex-column gap-1" [hidden]="examInfo().executionType?.type === 'MATURITY'">
                            <span class="exam-info-label">{{ 'i18n_calendar_instructions' | translate }}:</span>
                            <div class="text-break" [xmMath]="examInfo().enrollInstruction"></div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-12">
                        @if (showReservationWindowDescription()) {
                            <span class="xm-info-link" role="note">
                                <img class="arrow_icon pe-1" src="/assets/images/icon_info.png" alt="" />
                                {{ reservationWindowDescription() }}
                            </span>
                        }
                    </div>
                </div>
            </div>
        </div>
    `,
    styleUrls: ['./exam-info.component.scss', '../calendar.component.scss'],
    imports: [CourseCodeComponent, MathDirective, DatePipe, TranslateModule],
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
