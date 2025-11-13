// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
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
    imports: [DatePickerComponent, TranslateModule],
})
export class RecordsReportComponent {
    startDate = signal<Date | null>(null);
    endDate = signal<Date | null>(null);

    private files = inject(FileService);

    getExamRecords() {
        const start = this.startDate() ? new Date(this.startDate()!).getTime() : new Date().getTime();
        const end = this.endDate()
            ? new Date(this.endDate()!).setHours(23, 59, 59, 999)
            : new Date().setHours(23, 59, 59, 999);
        this.files.download('/app/exam/record', 'examrecords.csv', {
            start: start.toString(),
            end: end.toString(),
        });
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }
}
