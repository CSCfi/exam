// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { format } from 'date-fns';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    template: `
        <div class="row">
            <strong class="col-12">
                {{ 'i18n_get_graded_exams' | translate }}
            </strong>
        </div>
        <div class="row align-items-end mb-2">
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
                <button class="btn btn-success btn-sm float-end" (click)="getReviewsByDate()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-reviews-report',
    standalone: true,
    imports: [DatePickerComponent, NgbPopover, TranslateModule],
})
export class ReviewsReportComponent {
    startDate: Date | null = null;
    endDate: Date | null = null;

    constructor(private files: FileService) {}

    getReviewsByDate = () => {
        const f = format(this.startDate || new Date(), 'dd.MM.yyyy');
        const t = format(this.endDate || new Date(), 'dd.MM.yyyy');
        this.files.download(`/app/statistics/reviewsbydate/${f}/${t}`, `reviews_${f}_${t}.xlsx`);
    };

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
    };
}
