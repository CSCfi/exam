// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';

@Component({
    selector: 'xm-r-no-show',
    template: ` <div>{{ started() | date: 'dd.MM.yyyy' }}</div>
        <div class="status xm-text-danger">
            {{ 'i18n_exam_status_no_show' | translate }}
        </div>`,
    styles: `
        @use '../../../shared/breakpoints' as bp;

        // The status takes the rest of the row in the general info grid
        @include bp.up(md) {
            .status {
                grid-column: 2 / -1;
            }
        }
    `,
    imports: [DatePipe, TranslateModule],
})
export class NoShowComponent {
    readonly enrolment = input.required<ExamEnrolment>();
    readonly collaborative = input(false);

    readonly started = computed(() => {
        const enrolmentValue = this.enrolment();
        return enrolmentValue.examinationEventConfiguration
            ? enrolmentValue.examinationEventConfiguration.examinationEvent.start
            : enrolmentValue.reservation?.startAt || '';
    });
}
