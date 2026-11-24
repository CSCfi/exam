// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { ToastService } from 'src/app/shared/toast/toast.service';

@Component({
    template: `
        <section class="xm-stack xm-gap-2">
            <h2 class="report-title">{{ 'i18n_get_all_enrolments_reservations_and_cancelations' | translate }}</h2>
            <div class="xm-fields">
                <div>
                    <label for="enrolment">{{ 'i18n_select_exam' | translate }}</label>
                    <xm-dropdown-select
                        triggerId="enrolment"
                        [options]="examNames()"
                        (optionSelected)="enrolmentSelected($event)"
                        placeholder="{{ 'i18n_select' | translate }}"
                    ></xm-dropdown-select>
                </div>
                <button class="btn btn-success btn-sm xm-fields-action" (click)="getExamEnrolments()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </section>
    `,
    selector: 'xm-enrolments-report',
    styleUrl: './report-category.scss',
    imports: [DropdownSelectComponent, TranslateModule],
})
export class EnrolmentsReportComponent {
    readonly examNames = input<Option<string, number>[]>([]);
    readonly enrolment = signal<number | undefined>(undefined);

    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastService);
    private readonly files = inject(FileService);

    getExamEnrolments() {
        const currentEnrolment = this.enrolment();
        if (currentEnrolment) {
            this.files.download(`/app/reports/examenrollments/${currentEnrolment}`, 'exam_enrolments.xlsx');
        } else {
            this.toast.error(this.translate.instant('i18n_choose_exam'));
        }
    }

    enrolmentSelected(event?: Option<string, number>) {
        this.enrolment.set(event?.id);
    }
}
