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
import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FileService } from '../../../shared/file/file.service';
import { DropdownSelectComponent, Option } from '../../../shared/select/dropdown-select.component';

@Component({
    template: `
        <div class="top-row">
            <h4 class="col-md-12">
                {{ 'i18n_get_all_enrolments_reservations_and_cancelations' | translate }}
            </h4>
        </div>
        <div class="bottom-row d-flex justify-content-between">
            <div class="col-lg-10 mb-4">
                <label for="enrolment">{{ 'i18n_select_exam' | translate }}</label>
                <xm-dropdown-select
                    id="enrolment"
                    *ngIf="examNames"
                    [options]="examNames"
                    (optionSelected)="enrolmentSelected($event)"
                    placeholder="{{ 'i18n_select' | translate }}"
                ></xm-dropdown-select>
            </div>
            <div class="col-lg-2 mb-2">
                <label for="link"></label>
                <div id="link">
                    <a
                        (click)="getExamEnrolments()"
                        class="print-btn"
                        download
                        triggers="mouseenter:mouseleave"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        ngbPopover="{{ 'i18n_download' | translate }}"
                    >
                        <i class="bi-file-earmark-excel font-6"></i>
                    </a>
                </div>
            </div>
        </div>
    `,
    selector: 'xm-enrolments-report',
    standalone: true,
    imports: [NgIf, DropdownSelectComponent, NgbPopover, TranslateModule],
})
export class EnrolmentsReportComponent {
    @Input() examNames: Option<string, number>[] = [];
    enrolment?: number;

    constructor(private translate: TranslateService, private toast: ToastrService, private files: FileService) {}

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
