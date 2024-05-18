// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FileService } from 'src/app/shared/file/file.service';
import { DropdownSelectComponent, Option } from 'src/app/shared/select/dropdown-select.component';

@Component({
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
                    [options]="examNames"
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
    standalone: true,
    imports: [DropdownSelectComponent, NgbPopover, TranslateModule],
})
export class EnrolmentsReportComponent {
    @Input() examNames: Option<string, number>[] = [];
    enrolment?: number;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private files: FileService,
    ) {}

    getExamEnrolments = () => {
        if (this.enrolment) {
            this.files.download(`/app/statistics/examenrollments/${this.enrolment}`, 'exam_enrolments.xlsx');
        } else {
            this.toast.error(this.translate.instant('i18n_choose_exam'));
        }
    };

    enrolmentSelected = (event?: Option<string, number>) => {
        this.enrolment = event?.id;
    };
}
