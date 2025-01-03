// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { User } from 'src/app/session/session.model';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';

@Component({
    template: `
        <div class="row">
            <strong class="col-md-12">
                {{ 'i18n_get_all_student_activities' | translate }}
            </strong>
        </div>
        <div class="row align-items-end mb-2">
            <div class="col-3">
                <label for="student">{{ 'i18n_student' | translate }}</label>
                <xm-dropdown-select
                    id="student"
                    [options]="students"
                    (optionSelected)="studentSelected($event)"
                    placeholder="{{ 'i18n_select' | translate }}"
                ></xm-dropdown-select>
            </div>
            <div class="col-3">
                <label for="startAt">{{ 'i18n_start_time' | translate }}</label>
                <div id="startAt">
                    <xm-date-picker (updated)="startDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-3">
                <label for="endAt">{{ 'i18n_end_time' | translate }}</label>
                <div id="endAt">
                    <xm-date-picker (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-3">
                <button class="btn btn-success btn-sm float-end" (click)="getStudentReport()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-students-report',
    standalone: true,
    imports: [DropdownSelectComponent, DatePickerComponent, TranslateModule],
})
export class StudentsReportComponent {
    @Input() students: Option<User, number>[] = [];
    student?: number;
    startDate: Date | null = null;
    endDate: Date | null = null;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private files: FileService,
    ) {}

    getStudentReport = () => {
        if (this.student) {
            const f = format(this.startDate || new Date(), 'dd.MM.yyyy');
            const t = format(this.endDate || new Date(), 'dd.MM.yyyy');
            this.files.download(`/app/statistics/student/${this.student}/${f}/${t}`, 'student_activity.xlsx');
        } else {
            this.toast.error(this.translate.instant('i18n_choose_student'));
        }
    };

    studentSelected = (event?: Option<User, number>) => {
        this.student = event?.id;
    };

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
    };
}
