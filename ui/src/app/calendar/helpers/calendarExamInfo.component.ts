import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';

import { DateTimeService } from '../../utility/date/date.service';

import type { ExamInfo } from '../calendar.component';

@Component({
    selector: 'calendar-exam-info',
    template: `
        <div class="row student-enrolment-wrapper details-view">
            <div class="col-md-12">
                <div class="row">
                    <span class="col-md-12">
                        <span class="calendar-phase-title">1. {{ 'sitnet_calendar_phase_1' | translate }}</span>
                        <span class="calendar-phase-icon float-right">
                            <img class="arrow_icon" src="/assets/assets/images/icon-phase.png" alt="phase 1" />
                        </span>
                    </span>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="calendar-titles">
                            <span class="calendar-course-title">{{ examInfo.name }}</span>
                            <span *ngIf="examInfo.anonymous">({{ 'sitnet_anonymous_review' | translate }})</span>
                        </div>
                    </div>
                </div>
                <div class="row mart10">
                    <div class="col-md-12">
                        <div class="row">
                            <div class="col-6 col-sm-6 col-md-2 col-lg-2">{{ 'sitnet_course_name' | translate }}:</div>
                            <div class="col-6 col-sm-6 col-md-2 col-lg-2">
                                <div *ngIf="!collaborative">
                                    <course-code [course]="examInfo.course"></course-code>
                                    {{ examInfo.course.name }}
                                </div>
                            </div>
                            <div class="clearfix visible-xs"></div>
                            <div class="clearfix visible-sm"></div>
                            <div class="col-6 col-sm-6 col-md-2 col-lg-2">
                                {{ 'sitnet_exam_validity' | translate }}:
                            </div>
                            <div class="col-6 col-sm-6 col-md-2 col-lg-2">
                                {{ examInfo.examActiveStartDate | date: 'dd.MM.yyyy' }} -
                                {{ examInfo.examActiveEndDate | date: 'dd.MM.yyyy' }}
                            </div>
                            <div class="col-6 col-sm-6 col-md-2 col-lg-2">
                                {{ 'sitnet_exam_duration' | translate }}:
                            </div>
                            <div class="col-6 col-sm-6 col-md-2 col-lg-2">
                                {{ printExamDuration(examInfo) }}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mart10">
                    <div class="col-md-12">
                        <span class="student-exam-row-infolink" [hidden]="examInfo.executionType?.type === 'MATURITY'">
                            {{ 'sitnet_calendar_instructions' | translate }}:
                            <span [MathJax]="examInfo.enrollInstruction"></span>
                        </span>
                    </div>
                </div>
                <div class="row mart10">
                    <div class="col-md-12">
                        <span *ngIf="showReservationWindowInfo()" class="infolink">
                            <img class="arrow_icon padr10" src="/assets/assets/images/icon_info.png" alt="info-icon" />
                            {{ getReservationWindowDescription() }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class CalendarExamInfoComponent {
    @Input() examInfo!: ExamInfo;
    @Input() reservationWindowSize = 0;
    @Input() collaborative = false;

    reservationWindowEndDate?: moment.Moment;

    constructor(private translate: TranslateService, private DateTime: DateTimeService) {}

    ngOnInit() {
        this.reservationWindowEndDate = moment().add(this.reservationWindowSize, 'days');
    }

    printExamDuration = (exam: { duration: number }) => this.DateTime.printExamDuration(exam);

    getReservationWindowDescription(): string {
        const text = this.translate
            .instant('sitnet_description_reservation_window')
            .replace('{}', this.reservationWindowSize.toString());
        return `${text} (${this.reservationWindowEndDate?.format('DD.MM.YYYY')})`;
    }

    showReservationWindowInfo = (): boolean =>
        !!this.reservationWindowEndDate && moment(this.examInfo.examActiveEndDate) > this.reservationWindowEndDate;
}
