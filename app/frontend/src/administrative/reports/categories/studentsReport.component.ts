/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { FileService } from '../../../utility/file/file.service';

import type { User } from '../../../session/session.service';

@Component({
    template: `
        <div class="top-row">
            <h4 class="col-md-12">
                {{ 'sitnet_get_all_student_activities' | translate }}
            </h4>
        </div>
        <div class="bottom-row d-flex justify-content-between">
            <div class="col-lg-4 mb-2">
                <label for="student">{{ 'sitnet_student' | translate }}</label>
                <dropdown-select
                    id="student"
                    *ngIf="students"
                    [options]="students"
                    (on-select)="studentSelected($event)"
                ></dropdown-select>
            </div>
            <div class="col-lg-3 mb-2">
                <label for="startAt">{{ 'sitnet_start_time' | translate }}</label>
                <div id="startAt">
                    <date-picker (on-update)="startDateChanged($event)"></date-picker>
                </div>
            </div>
            <div class="col-lg-3 mb-2">
                <label for="endAt">{{ 'sitnet_end_time' | translate }}</label>
                <div id="endAt">
                    <date-picker (on-update)="endDateChanged($event)"></date-picker>
                </div>
            </div>
            <div class="col-lg-2 mb-2">
                <label for="link">&nbsp;</label>
                <div id="link">
                    <a
                        (click)="getStudentReport()"
                        class="print-btn"
                        download
                        popover-trigger="mouseenter:mouseleave"
                        ngbPopover="{{ 'sitnet_download' | translate }}"
                    >
                        <i class="bi-file-earmark-word font-6"></i>
                    </a>
                </div>
            </div>
        </div>
    `,
    selector: 'students-report',
})
export class StudentsReportComponent {
    @Input() students: User[];
    student: User;
    startDate: Date;
    endDate: Date;

    constructor(private datePipe: DatePipe, private translate: TranslateService, private files: FileService) {}

    getStudentReport = () => {
        if (this.student) {
            const f = this.datePipe.transform(this.startDate || new Date(), 'dd.MM.yyyy');
            const t = this.datePipe.transform(this.endDate || new Date(), 'dd.MM.yyyy');
            this.files.download(`/app/statistics/student/${this.student.id}/${f}/${t}`, 'student_activity.xlsx');
        } else {
            toast.error(this.translate.instant('sitnet_choose_student'));
        }
    };

    studentSelected = (event: { value: User }) => {
        this.student = event.value;
    };

    startDateChanged = (event: { date: Date }) => {
        this.startDate = event.date;
    };

    endDateChanged = (event: { date: Date }) => {
        this.endDate = event.date;
    };
}
