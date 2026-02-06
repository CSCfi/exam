// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';

@Component({
    template: `
        <div class="row">
            <strong class="col-12">
                {{ 'i18n_get_all_info_from_exam' | translate }}
                {{ 'i18n_excel_file' | translate }}
            </strong>
        </div>
        <div class="row mb-2 align-items-end">
            <div class="col-2">
                <label for="exam">{{ 'i18n_select_exam' | translate }}</label>
                @if (examNames) {
                    <xm-dropdown-select
                        id="exam"
                        [options]="examNames"
                        (optionSelected)="examSelected($event)"
                        placeholder="{{ 'i18n_select' | translate }}"
                    ></xm-dropdown-select>
                }
            </div>
            <div class="col-10">
                <button class="btn btn-success btn-sm float-end" (click)="getExams()">
                    <i class="bi-file-earmark-excel text-white pe-2"></i>{{ 'i18n_download' | translate }}
                </button>
            </div>
        </div>
    `,
    selector: 'xm-exams-report',
    imports: [DropdownSelectComponent, TranslateModule],
})
export class ExamsReportComponent {
    @Input() examNames: Option<string, number>[] = [];
    exam?: number;

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private files = inject(FileService);

    examSelected = (event?: Option<string, number>) => (this.exam = event?.id);

    getExams = () => {
        if (this.exam) {
            const url = `/app/statistics/examnames/${this.exam}/xlsx`;
            const fileName = 'exams.xlsx';
            this.files.download(url, fileName);
        } else {
            this.toast.error(this.translate.instant('i18n_choose_exam'));
        }
    };
}
