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
            <h2 class="report-title">{{ 'i18n_get_all_teacher_exams' | translate }}</h2>
            <div class="xm-fields">
                <div>
                    <label for="teacher">{{ 'i18n_teacher' | translate }}</label>
                    <xm-dropdown-select
                        triggerId="teacher"
                        [options]="teachers()"
                        (optionSelected)="teacherSelected($event)"
                        placeholder="{{ 'i18n_select' | translate }}"
                    ></xm-dropdown-select>
                </div>
                <div>
                    <label for="teachers-report-start">{{ 'i18n_start_time' | translate }}</label>
                    <xm-date-picker
                        inputId="teachers-report-start"
                        (updated)="answerStartDateChanged($event)"
                    ></xm-date-picker>
                </div>
                <div>
                    <label for="teachers-report-end">{{ 'i18n_end_time' | translate }}</label>
                    <xm-date-picker
                        inputId="teachers-report-end"
                        (updated)="answerEndDateChanged($event)"
                    ></xm-date-picker>
                </div>
                <button class="btn btn-success btn-sm xm-fields-action" (click)="getTeacherExamsByDate()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </section>
    `,
    selector: 'xm-teachers-report',
    styleUrl: './report-category.scss',
    imports: [DropdownSelectComponent, DatePickerComponent, TranslateModule],
})
export class TeachersReportComponent {
    readonly teachers = input<Option<User, number>[]>([]);
    readonly teacher = signal<number | undefined>(undefined);
    readonly answerStartDate = signal<Date | null>(null);
    readonly answerEndDate = signal<Date | null>(null);

    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastService);
    private readonly files = inject(FileService);

    getTeacherExamsByDate() {
        const f = DateTime.fromJSDate(this.answerStartDate() || new Date()).toFormat('dd.MM.yyyy');
        const t = DateTime.fromJSDate(this.answerEndDate() || new Date()).toFormat('dd.MM.yyyy');
        const currentTeacher = this.teacher();
        if (currentTeacher) {
            this.files.download(
                `/app/reports/teacherexamsbydate/${currentTeacher}/${f}/${t}`,
                `teacherexams_${f}_${t}.xlsx`,
            );
        } else {
            this.toast.error(this.translate.instant('i18n_choose_teacher'));
        }
    }

    teacherSelected(event?: Option<User, number>) {
        this.teacher.set(event?.id);
    }

    answerStartDateChanged(event: { date: Date | null }) {
        this.answerStartDate.set(event.date);
    }

    answerEndDateChanged(event: { date: Date | null }) {
        this.answerEndDate.set(event.date);
    }
}
