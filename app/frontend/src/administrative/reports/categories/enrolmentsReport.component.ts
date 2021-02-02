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

import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';
import { FileService } from '../../../utility/file/file.service';
import { ExamName } from '../reports.service';

@Component({
    template: `
        <div class="top-row">
            <h4 class="col-md-12">
                {{ 'sitnet_get_all_enrolments_reservations_and_cancelations' | translate }}
            </h4>
        </div>
        <div class="bottom-row">
            <div class="col-md-10">
                <label for="enrolment">{{ 'sitnet_select_exam' | translate }}</label>
                <dropdown-select
                    id="enrolment"
                    [options]="examNames"
                    (onSelect)="enrolmentSelected($event)"
                ></dropdown-select>
            </div>
            <div class="col-md-2">
                <label for="link"></label>
                <div id="link">
                    <a
                        (click)="getExamEnrolments()"
                        class="fa-stack fa-lg pull-right"
                        download
                        triggers="mouseenter:mouseleave"
                        ngbPopover="{{ 'sitnet_download' | translate }}"
                    >
                        <i class="fa fa-stop fa-stack-2x sitnet-text-ready"></i>
                        <i class="fa fa-file-word-o sitnet-white fa-stack-1x"></i>
                    </a>
                </div>
            </div>
        </div>
    `,
    selector: 'enrolments-report',
})
export class EnrolmentsReportComponent implements OnInit {
    @Input() examNames: ExamName[];
    enrolment: ExamName;

    constructor(private translate: TranslateService, private files: FileService) {}

    ngOnInit() {
        console.log(this.examNames);
    }

    getExamEnrolments = () => {
        if (this.enrolment) {
            this.files.download(`/app/statistics/examenrollments/${this.enrolment.id}`, 'exam_enrolments.xlsx');
        } else {
            toast.error(this.translate.instant('sitnet_choose_exam'));
        }
    };

    enrolmentSelected = (event: { value: ExamName }) => {
        this.enrolment = event.value;
    };
}
