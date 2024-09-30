// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
