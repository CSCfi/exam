// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    template: `
        <section class="xm-stack xm-gap-2">
            <h2 class="report-title">{{ 'i18n_get_all_exam_answers' | translate }}</h2>
            <div class="xm-fields">
                <!-- Start & End time datepickers -->
                <div>
                    <label for="answers-report-start">{{ 'i18n_start_time' | translate }}</label>
                    <xm-date-picker
                        inputId="answers-report-start"
                        (updated)="startDateChanged($event)"
                    ></xm-date-picker>
                </div>
                <div>
                    <label for="answers-report-end">{{ 'i18n_end_time' | translate }}</label>
                    <xm-date-picker inputId="answers-report-end" (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
                <button class="btn btn-success btn-sm xm-fields-action" (click)="getExamAnswerReport()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </section>
    `,
    selector: 'xm-answers-report',
    styleUrl: './report-category.scss',
    imports: [DatePickerComponent, TranslateModule],
})
export class AnswersReportComponent {
    readonly startDate = signal<Date | null>(null);
    readonly endDate = signal<Date | null>(null);

    private readonly files = inject(FileService);

    getExamAnswerReport() {
        const f = DateTime.fromJSDate(this.startDate() || new Date()).toFormat('dd.MM.yyyy');
        const t = DateTime.fromJSDate(this.endDate() || new Date()).toFormat('dd.MM.yyyy');
        this.files.download(`/app/reports/allexams/${f}/${t}`, `exam_answers_${f}_${t}.xlsx`);
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }
}
