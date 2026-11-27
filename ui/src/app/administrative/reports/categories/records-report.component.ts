// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    template: `
        <section class="xm-stack xm-gap-2">
            <h2 class="report-title">{{ 'i18n_get_graded_logged_csv' | translate }}</h2>
            <div class="xm-fields">
                <!-- Start & End time datepickers -->
                <div>
                    <label for="records-report-start">{{ 'i18n_start_time' | translate }}</label>
                    <xm-date-picker
                        inputId="records-report-start"
                        (updated)="startDateChanged($event)"
                    ></xm-date-picker>
                </div>
                <div>
                    <label for="records-report-end">{{ 'i18n_end_time' | translate }}</label>
                    <xm-date-picker inputId="records-report-end" (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
                <button class="btn btn-success btn-sm xm-fields-action" (click)="getExamRecords()">
                    <i class="bi-file-earmark-excel xm-text-inverse pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </section>
    `,
    selector: 'xm-records-report',
    styleUrl: './report-category.scss',
    imports: [DatePickerComponent, TranslateModule],
})
export class RecordsReportComponent {
    readonly startDate = signal<Date | null>(null);
    readonly endDate = signal<Date | null>(null);

    private readonly files = inject(FileService);

    getExamRecords() {
        const start = this.startDate() ? new Date(this.startDate()!).getTime() : new Date().getTime();
        const end = this.endDate()
            ? new Date(this.endDate()!).setHours(23, 59, 59, 999)
            : new Date().setHours(23, 59, 59, 999);
        this.files.download('/app/exam/record', 'examrecords.csv', {
            params: { start: start.toString(), end: end.toString() },
        });
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }
}
