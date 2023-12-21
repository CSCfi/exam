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
import { DatePipe, NgIf } from '@angular/common';
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
        <div class="top-row">
            <h4 class="col-md-12">
                {{ 'i18n_get_all_student_activities' | translate }}
            </h4>
        </div>
        <div class="bottom-row d-flex justify-content-between">
            <div class="col-lg-4 mb-2">
                <label for="student">{{ 'i18n_student' | translate }}</label>
                <xm-dropdown-select
                    id="student"
                    *ngIf="students"
                    [options]="students"
                    (optionSelected)="studentSelected($event)"
                    placeholder="{{ 'i18n_select' | translate }}"
                ></xm-dropdown-select>
            </div>
            <div class="col-lg-3 mb-2">
                <label for="startAt">{{ 'i18n_start_time' | translate }}</label>
                <div id="startAt">
                    <xm-date-picker (updated)="startDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-lg-3 mb-2">
                <label for="endAt">{{ 'i18n_end_time' | translate }}</label>
                <div id="endAt">
                    <xm-date-picker (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
            </div>
            <div class="col-lg-2 mb-2">
                <label for="link">&nbsp;</label>
                <div id="link">
                    <a
                        (click)="getStudentReport()"
                        class="print-btn"
                        download
                        triggers="mouseenter:mouseleave"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        ngbPopover="{{ 'i18n_download' | translate }}"
                    >
                        <i class="bi-file-earmark-excel font-6"></i>
                    </a>
                </div>
            </div>
        </div>
    `,
    selector: 'xm-students-report',
    standalone: true,
    imports: [NgIf, DropdownSelectComponent, DatePickerComponent, NgbPopover, TranslateModule],
})
export class StudentsReportComponent {
    @Input() students: Option<User, number>[] = [];
    student?: number;
    startDate: Date | null = null;
    endDate: Date | null = null;

    constructor(
        private datePipe: DatePipe,
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
