// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs/operators';
import { QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (queryParams()) {
            <div class="row">
                <div class="col-3">
                    <strong>{{ 'i18n_assessed_exams' | translate }}:</strong>
                </div>
                <div class="col-9">{{ data().assessed }}</div>
            </div>
            <div class="row">
                <div class="col-3">
                    <strong>{{ 'i18n_unassessed_exams' | translate }}:</strong>
                </div>
                <div class="col-9">{{ data().unAssessed }}</div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <strong>{{ 'i18n_aborted_exams' | translate }}:</strong>
                </div>
                <div class="col-9">{{ data().aborted }}</div>
            </div>
        }
    `,
    selector: 'xm-response-statistics',
    imports: [TranslateModule],
})
export class ResponseStatisticsComponent {
    readonly queryParams = input<QueryParams | null>(null);
    readonly data = signal({ assessed: 0, unAssessed: 0, aborted: 0 });

    private readonly Statistics = inject(StatisticsService);

    constructor() {
        toObservable(this.queryParams)
            .pipe(
                filter((params): params is QueryParams => !!params?.start && !!params?.end),
                switchMap((params) => this.Statistics.listResponses$(params)),
                takeUntilDestroyed(),
            )
            .subscribe((resp) => {
                this.data.set(resp);
            });
    }
}
