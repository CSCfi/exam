/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import { Component, Input } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FileService } from '../../../shared/file/file.service';
import { DropdownSelectComponent, Option } from '../../../shared/select/dropdown-select.component';

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
    standalone: true,
    imports: [DropdownSelectComponent, NgbPopover, TranslateModule],
})
export class ExamsReportComponent {
    @Input() examNames: Option<string, number>[] = [];

    exam?: number;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private files: FileService,
    ) {}

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
