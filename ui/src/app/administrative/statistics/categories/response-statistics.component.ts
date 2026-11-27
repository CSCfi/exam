// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs/operators';
import { QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    template: `
        @if (queryParams()) {
            <dl class="xm-details">
                <dt class="xm-text-bold">{{ 'i18n_assessed_exams' | translate }}:</dt>
                <dd>{{ data().assessed }}</dd>
                <dt class="xm-text-bold">{{ 'i18n_unassessed_exams' | translate }}:</dt>
                <dd>{{ data().unassessed }}</dd>
                <dt class="xm-text-bold">{{ 'i18n_aborted_exams' | translate }}:</dt>
                <dd>{{ data().aborted }}</dd>
            </dl>
        }
    `,
    selector: 'xm-response-statistics',
    imports: [TranslateModule],
})
export class ResponseStatisticsComponent {
    readonly queryParams = input<QueryParams | null>(null);
    readonly data = signal({ assessed: 0, unassessed: 0, aborted: 0 });

    private readonly Statistics = inject(StatisticsService);

    constructor() {
        toObservable(this.queryParams)
            .pipe(
                filter((params): params is QueryParams => !!params),
                switchMap((params) => this.Statistics.listResponses$(params)),
                takeUntilDestroyed(),
            )
            .subscribe((resp) => {
                this.data.set(resp);
            });
    }
}
