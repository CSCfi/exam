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
import { Component } from '@angular/core';

import { FileService } from '../../../utility/file/file.service';

@Component({
    template: `
        <div class="top-row">
            <h4 class="col-md-12">
                {{ 'sitnet_get_all_exam_answers' | translate }}
            </h4>
        </div>
        <div class="bottom-row d-flex justify-content-between">
            <!-- Start & End time datepickers -->
            <div class="col-lg-5 mb-2">
                <label for="startAt">{{ 'sitnet_start_time' | translate }}</label>
                <div id="startAt">
                    <date-picker (onUpdate)="startDateChanged($event)"></date-picker>
                </div>
            </div>
            <div class="col-lg-5 mb-2">
                <label for="endAt">{{ 'sitnet_end_time' | translate }}</label>
                <div id="endAt">
                    <date-picker (onUpdate)="endDateChanged($event)"></date-picker>
                </div>
            </div>
            <div class="col-lg-2 mb-2">
                <label for="link">&nbsp;</label>
                <div id="link">
                    <a
                        (click)="getExamAnswerReport()"
                        class="print-btn"
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
    selector: 'answers-report',
})
export class AnswersReportComponent {
    startDate: Date;
    endDate: Date;

    constructor(private datePipe: DatePipe, private files: FileService) {}

    getExamAnswerReport = () => {
        const f = this.datePipe.transform(this.startDate || new Date(), 'dd.MM.yyyy');
        const t = this.datePipe.transform(this.endDate || new Date(), 'dd.MM.yyyy');
        this.files.download(`/app/statistics/allexams/${f}/${t}`, `exam_answers_${f}_${t}.xlsx`);
    };

    startDateChanged = (event: { date: Date }) => {
        this.startDate = event.date;
    };

    endDateChanged = (event: { date: Date }) => {
        this.endDate = event.date;
    };
}