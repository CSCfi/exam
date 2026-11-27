// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { User } from 'src/app/session/session.model';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { ToastService } from 'src/app/shared/toast/toast.service';

@Component({
    template: `
        <section class="xm-stack xm-gap-2">
            <h2 class="report-title">{{ 'i18n_get_all_student_activities' | translate }}</h2>
            <div class="xm-fields">
                <div>
                    <label for="student">{{ 'i18n_student' | translate }}</label>
                    <xm-dropdown-select
                        triggerId="student"
                        [options]="students()"
                        (optionSelected)="studentSelected($event)"
                        placeholder="{{ 'i18n_select' | translate }}"
                    ></xm-dropdown-select>
                </div>
                <div>
                    <label for="students-report-start">{{ 'i18n_start_time' | translate }}</label>
                    <xm-date-picker
                        inputId="students-report-start"
                        (updated)="startDateChanged($event)"
                    ></xm-date-picker>
                </div>
                <div>
                    <label for="students-report-end">{{ 'i18n_end_time' | translate }}</label>
                    <xm-date-picker inputId="students-report-end" (updated)="endDateChanged($event)"></xm-date-picker>
                </div>
                <button class="btn btn-success btn-sm xm-fields-action" (click)="getStudentReport()">
                    <i class="bi-file-earmark-excel xm-text-inverse pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </section>
    `,
    selector: 'xm-students-report',
    styleUrl: './report-category.scss',
    imports: [DropdownSelectComponent, DatePickerComponent, TranslateModule],
})
export class StudentsReportComponent {
    readonly students = input<Option<User, number>[]>([]);
    readonly student = signal<number | undefined>(undefined);
    readonly startDate = signal<Date | null>(null);
    readonly endDate = signal<Date | null>(null);

    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastService);
    private readonly files = inject(FileService);

    getStudentReport() {
        const currentStudent = this.student();
        if (currentStudent) {
            const f = DateTime.fromJSDate(this.startDate() || new Date()).toFormat('dd.MM.yyyy');
            const t = DateTime.fromJSDate(this.endDate() || new Date()).toFormat('dd.MM.yyyy');
            this.files.download(`/app/reports/student/${currentStudent}/${f}/${t}`, 'student_activity.xlsx');
        } else {
            this.toast.error(this.translate.instant('i18n_choose_student'));
        }
    }

    studentSelected(event?: Option<User, number>) {
        this.student.set(event?.id);
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }
}
