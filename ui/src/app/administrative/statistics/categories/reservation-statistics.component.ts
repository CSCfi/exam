// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row my-2">
            <div class="col-12">
                <button class="btn btn-sm btn-primary" (click)="listReservations()">
                    {{ 'i18n_search' | translate }}
                </button>
            </div>
        </div>
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
    `,
    selector: 'xm-reservation-statistics',
    imports: [TranslateModule],
})
export class ReservationStatisticsComponent {
    queryParams = input<QueryParams>({});
    data = signal({ noShows: 0, appearances: 0 });

    private Statistics = inject(StatisticsService);

    constructor() {
        this.listReservations();
    }

    listReservations() {
        this.Statistics.listReservations$(this.queryParams()).subscribe((resp) => {
            this.data.set(resp);
        });
    }
}
