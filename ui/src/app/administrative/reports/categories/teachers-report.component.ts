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

import { Component, Input } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { User } from '../../../session/session.service';
import { DatePickerComponent } from '../../../shared/date/date-picker.component';
import { FileService } from '../../../shared/file/file.service';
import { DropdownSelectComponent, Option } from '../../../shared/select/dropdown-select.component';

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
    standalone: true,
    imports: [DropdownSelectComponent, DatePickerComponent, NgbPopover, TranslateModule],
})
export class TeachersReportComponent {
    @Input() teachers: Option<User, number>[] = [];
    teacher?: number;
    answerStartDate: Date | null = null;
    answerEndDate: Date | null = null;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private files: FileService,
    ) {}

    getTeacherExamsByDate = () => {
        const f = format(this.answerStartDate || new Date(), 'dd.MM.yyyy');
        const t = format(this.answerEndDate || new Date(), 'dd.MM.yyyy');
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
