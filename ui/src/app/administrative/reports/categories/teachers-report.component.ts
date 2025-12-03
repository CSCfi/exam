// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import type { User } from 'src/app/session/session.model';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';

@Component({
    template: `
        <div class="row">
            <strong class="col-12">
                {{ 'i18n_get_all_teacher_exams' | translate }}
            </strong>
        </div>
        <div class="row align-items-end mb-2">
            <div class="col-3">
                <label for="teacher">{{ 'i18n_teacher' | translate }}</label>
                <xm-dropdown-select
                    id="teacher"
                    [options]="teachers"
                    (optionSelected)="teacherSelected($event)"
                    placeholder="{{ 'i18n_select' | translate }}"
                ></xm-dropdown-select>
            </div>
            <div class="col-3">
                <label for="startAt">{{ 'i18n_start_time' | translate }}</label>
                <div id="startAt">
                    <xm-date-picker (updated)="answerStartDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-3">
                <label for="endAt">{{ 'i18n_end_time' | translate }}</label>
                <div id="endAt">
                    <xm-date-picker (updated)="answerEndDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-3">
                <button class="btn btn-success btn-sm float-end" (click)="getTeacherExamsByDate()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-teachers-report',
    imports: [DropdownSelectComponent, DatePickerComponent, TranslateModule],
})
export class TeachersReportComponent {
    @Input() teachers: Option<User, number>[] = [];
    teacher?: number;
    answerStartDate: Date | null = null;
    answerEndDate: Date | null = null;

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private files = inject(FileService);

    getTeacherExamsByDate = () => {
        const f = DateTime.fromJSDate(this.answerStartDate || new Date()).toFormat('dd.MM.yyyy');
        const t = DateTime.fromJSDate(this.answerEndDate || new Date()).toFormat('dd.MM.yyyy');
        if (this.teacher) {
            this.files.download(
                `/app/statistics/teacherexamsbydate/${this.teacher}/${f}/${t}`,
                `teacherexams_${f}_${t}.xlsx`,
            );
        } else {
            this.toast.error(this.translate.instant('i18n_choose_teacher'));
        }
    };

    teacherSelected = (event?: Option<User, number>) => {
        this.teacher = event?.id;
    };

    answerStartDateChanged = (event: { date: Date | null }) => {
        this.answerStartDate = event.date;
    };

    answerEndDateChanged = (event: { date: Date | null }) => {
        this.answerEndDate = event.date;
    };
}
