// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
                    <strong>{{ 'i18n_total_reservations' | translate }}:</strong>
                </div>
                <div class="col-9">{{ data().appearances }}</div>
            </div>
            <div class="row">
                <div class="col-3">
                    <strong>{{ 'i18n_total_no_shows' | translate }}:</strong>
                </div>
                <div class="col-9">{{ data().noShows }}</div>
            </div>
        }
    `,
    selector: 'xm-reservation-statistics',
    imports: [TranslateModule],
})
export class ReservationStatisticsComponent {
    readonly queryParams = input<QueryParams | null>(null);
    readonly data = signal({ noShows: 0, appearances: 0 });

    private readonly Statistics = inject(StatisticsService);

    constructor() {
        toObservable(this.queryParams)
            .pipe(
                filter((params): params is QueryParams => !!params?.start && !!params?.end),
                switchMap((params) => this.Statistics.listReservations$(params)),
            )
            .subscribe((resp) => {
                this.data.set(resp);
            });
    }
}
