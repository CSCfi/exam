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
import { Component } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    template: `
        <div class="row">
            <strong class="col-12">
                {{ 'i18n_get_graded_logged_csv' | translate }}
            </strong>
        </div>
        <div class="row align-items-end mb-2">
            <!-- Start & End time datepickers -->
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
            <div class="col-6">
                <button class="btn btn-success btn-sm float-end" (click)="getExamRecords()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-records-report',
    standalone: true,
    imports: [DatePickerComponent, NgbPopover, TranslateModule],
})
export class RecordsReportComponent {
    startDate: Date | null = null;
    endDate: Date | null = null;

    constructor(private files: FileService) {}

    getExamRecords = () => {
        const start = this.startDate ? new Date(this.startDate).getTime() : new Date().getTime();
        const end = this.endDate
            ? new Date(this.endDate).setHours(23, 59, 59, 999)
            : new Date().setHours(23, 59, 59, 999);
        this.files.download('/app/exam/record', 'examrecords.csv', {
            startDate: start.toString(),
            endDate: end.toString(),
        });
    };

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
    };
}
