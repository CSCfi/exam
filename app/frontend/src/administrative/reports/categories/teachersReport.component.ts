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
                {{ 'sitnet_get_all_teacher_exams' | translate }}
            </h4>
        </div>
        <div class="bottom-row d-flex justify-content-between">
            <div class="col-lg-4 mb-2">
                <label for="teacher">{{ 'sitnet_teacher' | translate }}</label>
                <dropdown-select
                    id="teacher"
                    *ngIf="teachers"
                    [options]="teachers"
                    (onSelect)="teacherSelected($event)"
                ></dropdown-select>
            </div>
            <div class="col-lg-3 mb-2">
                <label for="startAt">{{ 'sitnet_start_time' | translate }}</label>
                <div id="startAt">
                    <date-picker (onUpdate)="answerStartDateChanged($event)"></date-picker>
                </div>
            </div>
            <div class="col-lg-3 mb-2">
                <label for="endAt">{{ 'sitnet_end_time' | translate }}</label>
                <div id="endAt">
                    <date-picker (onUpdate)="answerEndDateChanged($event)"></date-picker>
                </div>
            </div>
            <div class="col-lg-2 mb-2">
                <label for="link">&nbsp;</label>
                <div id="link">
                    <a
                        class="print-btn"
                        (click)="getTeacherExamsByDate()"
                        download
                        triggers="mouseenter:mouseleave"
                        ngbPopover="{{ 'sitnet_download' | translate }}"
                    >
                        <i class="bi-file-earmark-excel font-6"></i>
                    </a>
                </div>
            </div>
        </div>
    `,
    selector: 'teachers-report',
})
export class TeachersReportComponent {
    @Input() teachers: User[];
    teacher: User;
    answerStartDate: Date;
    answerEndDate: Date;

    constructor(private datePipe: DatePipe, private translate: TranslateService, private files: FileService) {}

    getTeacherExamsByDate = () => {
        const f = this.datePipe.transform(this.answerStartDate || new Date(), 'dd.MM.yyyy');
        const t = this.datePipe.transform(this.answerEndDate || new Date(), 'dd.MM.yyyy');
        if (this.teacher) {
            this.files.download(
                `/app/statistics/teacherexamsbydate/${this.teacher.id}/${f}/${t}`,
                `teacherexams_${f}_${t}.xlsx`,
            );
        } else {
            toast.error(this.translate.instant('sitnet_choose_teacher'));
        }
    };

    teacherSelected = (event: { value: User }) => {
        this.teacher = event.value;
    };

    answerStartDateChanged = (event: { date: Date }) => {
        this.answerStartDate = event.date;
    };

    answerEndDateChanged = (event: { date: Date }) => {
        this.answerEndDate = event.date;
    };
}
