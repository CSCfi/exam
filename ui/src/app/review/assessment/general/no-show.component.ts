// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';

@Component({
    selector: 'xm-r-no-show',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: ` <div class="col-md-2 ">{{ started() | date: 'dd.MM.yyyy' }}</div>
        <div class="col-md-10 text-danger">
            {{ 'i18n_exam_status_no_show' | translate }}
        </div>`,
    imports: [DatePipe, TranslateModule],
})
export class NoShowComponent {
    enrolment = input.required<ExamEnrolment>();
    collaborative = input(false);

    started = computed(() => {
        const enrolmentValue = this.enrolment();
        return enrolmentValue.examinationEventConfiguration
            ? enrolmentValue.examinationEventConfiguration.examinationEvent.start
            : enrolmentValue.reservation?.startAt || '';
    });
}
