// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { QueryParams } from 'src/app/administrative/statistics/statistics.service';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    template: `
        <div class="row my-2">
            <div class="col-12">
                <button class="btn btn-primary" (click)="listReservations()">
                    {{ 'i18n_search' | translate }}
                </button>
            </div>
        </div>
        <div class="row">
            <div class="col-3">
                <strong>{{ 'i18n_total_reservations' | translate }}:</strong>
            </div>
            <div class="col-9">{{ data.appearances }}</div>
        </div>
        <div class="row">
            <div class="col-3">
                <strong>{{ 'i18n_total_no_shows' | translate }}:</strong>
            </div>
            <div class="col-9">{{ data.noShows }}</div>
        </div>
    `,
    selector: 'xm-reservation-statistics',
    standalone: true,
    imports: [TranslateModule],
})
export class ReservationStatisticsComponent implements OnInit {
    @Input() queryParams: QueryParams = {};

    data = { noShows: 0, appearances: 0 };

    constructor(private Statistics: StatisticsService) {}

    ngOnInit() {
        this.listReservations();
    }

    listReservations = () =>
        this.Statistics.listReservations$(this.queryParams).subscribe((resp) => {
            this.data = resp;
        });
}
