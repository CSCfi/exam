// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row">
            <strong class="col-12">
                {{ 'i18n_get_all_exam_answers' | translate }}
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
                <button class="btn btn-success btn-sm float-end" (click)="getExamAnswerReport()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-answers-report',
    imports: [DatePickerComponent, TranslateModule],
})
export class AnswersReportComponent {
    startDate = signal<Date | null>(null);
    endDate = signal<Date | null>(null);

    private files = inject(FileService);

    getExamAnswerReport() {
        const f = DateTime.fromJSDate(this.startDate() || new Date()).toFormat('dd.MM.yyyy');
        const t = DateTime.fromJSDate(this.endDate() || new Date()).toFormat('dd.MM.yyyy');
        this.files.download(`/app/statistics/allexams/${f}/${t}`, `exam_answers_${f}_${t}.xlsx`);
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }
}
