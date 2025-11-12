// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row">
            <strong class="col-md-12">
                {{ 'i18n_get_all_enrolments_reservations_and_cancelations' | translate }}
            </strong>
        </div>
        <div class="row mb-2 align-items-end">
            <div class="col-10">
                <label for="enrolment">{{ 'i18n_select_exam' | translate }}</label>
                <xm-dropdown-select
                    id="enrolment"
                    [options]="examNames()"
                    (optionSelected)="enrolmentSelected($event)"
                    placeholder="{{ 'i18n_select' | translate }}"
                ></xm-dropdown-select>
            </div>
            <div class="col-2">
                <button class="btn btn-success btn-sm float-end" (click)="getExamEnrolments()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-enrolments-report',
    imports: [DropdownSelectComponent, TranslateModule],
})
export class EnrolmentsReportComponent {
    examNames = input<Option<string, number>[]>([]);
    enrolment = signal<number | undefined>(undefined);

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private files = inject(FileService);

    getExamEnrolments() {
        const currentEnrolment = this.enrolment();
        if (currentEnrolment) {
            this.files.download(`/app/statistics/examenrollments/${currentEnrolment}`, 'exam_enrolments.xlsx');
        } else {
            this.toast.error(this.translate.instant('i18n_choose_exam'));
        }
    }

    enrolmentSelected(event?: Option<string, number>) {
        this.enrolment.set(event?.id);
    }
}
