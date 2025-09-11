// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamInfo } from 'src/app/calendar/calendar.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';

@Component({
    selector: 'xm-calendar-exam-info',
    template: `
        <div class="row xm-study-item-container m-2 details-view">
            <div class="col-md-12">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h2 class="calendar-phase-title">1. {{ 'i18n_calendar_phase_1' | translate }}</h2>
                    </div>
                    <div class="col-md-4">
                        <img
                            class="calendar-phase-icon float-end arrow_icon"
                            src="/assets/images/icon-phase.png"
                            alt=""
                        />
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="calendar-titles">
                            <span class="calendar-course-title">{{ examInfo.name }}</span>
                            @if (examInfo.anonymous) {
                                <span>({{ 'i18n_anonymous_review' | translate }})</span>
                            }
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-12">
                        <div class="row">
                            <div class="col-6 col-sm-6 col-md-4 col-lg-4">{{ 'i18n_course_name' | translate }}:</div>
                            <div class="col-6 col-sm-6 col-md-4 col-lg-4">
                                @if (!collaborative) {
                                    <div>
                                        <xm-course-code [course]="examInfo.course"></xm-course-code>
                                        {{ examInfo.course.name }}
                                    </div>
                                }
                            </div>
                            <div class="clearfix visible-xs"></div>
                            <div class="clearfix visible-sm"></div>
                            <div class=" mt-2 col-6 col-sm-6 col-md-4 col-lg-4">
                                {{ 'i18n_exam_validity' | translate }}:
                            </div>
                            <div class="mt-2 col-6 col-sm-6 col-md-4 col-lg-4">
                                {{ examInfo.periodStart | date: 'dd.MM.yyyy' }} -
                                {{ examInfo.periodEnd | date: 'dd.MM.yyyy' }}
                            </div>
                            <div class="clearfix visible-md"></div>
                            <div class="mt-2 col-6 col-sm-6 col-md-4 col-lg-4">
                                {{ 'i18n_exam_duration' | translate }}:
                            </div>
                            <div class="mt-2 col-6 col-sm-6 col-md-4 col-lg-4">
                                {{ printExamDuration(examInfo) }}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-12">
                        <span class="" [hidden]="examInfo.executionType?.type === 'MATURITY'">
                            {{ 'i18n_calendar_instructions' | translate }}:
                            <span [xmMathJax]="examInfo.enrollInstruction"></span>
                        </span>
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
    styleUrls: ['../calendar.component.scss'],
    imports: [CourseCodeComponent, MathJaxDirective, DatePipe, TranslateModule],
})
export class CalendarExamInfoComponent implements OnInit {
    @Input() examInfo!: ExamInfo;
    @Input() reservationWindowSize = 0;
    @Input() collaborative = false;

    reservationWindowEndDate = signal(new Date());
    reservationWindowDescription = computed(() => {
        const text = this.translate
            .instant('i18n_description_reservation_window')
            .replace('{}', this.reservationWindowSize.toString());
        return `${text} (${DateTime.fromJSDate(this.reservationWindowEndDate()).toFormat('dd.MM.yyyy')})`;
    });
    showReservationWindowDescription = computed(
        () =>
            !!this.reservationWindowEndDate &&
            DateTime.fromISO(this.examInfo.periodEnd as string).toJSDate() > this.reservationWindowEndDate(),
    );

    private translate = inject(TranslateService);
    private DateTimeService = inject(DateTimeService);

    ngOnInit() {
        this.reservationWindowEndDate.set(
            DateTime.fromJSDate(this.reservationWindowEndDate()).plus({ day: this.reservationWindowSize }).toJSDate(),
        );
    }

    printExamDuration = (exam: { duration: number }) => this.DateTimeService.printExamDuration(exam);
}
