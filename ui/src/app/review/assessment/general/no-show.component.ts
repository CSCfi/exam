/*
 * Copyright (c) 2017 Exam Consortium
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
import { DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';

@Component({
    selector: 'xm-r-no-show',
    template: ` <div class="col-md-2 ">{{ started | date: 'dd.MM.yyyy' }}</div>
        <div class="col-md-10 text-danger">
            {{ 'i18n_exam_status_no_show' | translate }}
        </div>`,
    standalone: true,
    imports: [DatePipe, TranslateModule],
})
export class NoShowComponent implements OnInit {
    @Input() enrolment!: ExamEnrolment;
    @Input() collaborative = false;

    started = '';

    ngOnInit() {
        this.started = this.enrolment.examinationEventConfiguration
            ? this.enrolment.examinationEventConfiguration.examinationEvent.start
            : this.enrolment.reservation?.startAt || '';
    }
}
