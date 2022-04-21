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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { QueryParams } from '../statistics.service';
import { StatisticsService } from '../statistics.service';

@Component({
    template: `
        <div class="bottom-row">
            <div class="col-md-12">
                <button class="btn btn-primary" (click)="listReservations()">
                    {{ 'sitnet_search' | translate }}
                </button>
            </div>
        </div>
        <div class="top-row">
            <div class="col-md-2">
                <strong>{{ 'sitnet_total_reservations' | translate }}:</strong>
            </div>
            <div class="col-md-10">{{ reservations.length }}</div>
        </div>
        <div class="main-row">
            <div class="col-md-2">
                <strong>{{ 'sitnet_total_no_shows' | translate }}:</strong>
            </div>
            <div class="col-md-10">{{ noShows.length }}</div>
        </div>
    `,
    selector: 'xm-reservation-statistics',
})
export class ReservationStatisticsComponent implements OnInit {
    @Input() queryParams: QueryParams = {};

    reservations: { noShow: boolean }[] = [];
    noShows: { noShow: boolean }[] = [];

    constructor(private Statistics: StatisticsService) {}

    ngOnInit() {
        this.listReservations();
    }

    listReservations = () =>
        this.Statistics.listReservations$(this.queryParams).subscribe((resp) => {
            this.reservations = resp.filter((r) => !r.noShow);
            this.noShows = resp.filter((r) => r.noShow);
        });
}
