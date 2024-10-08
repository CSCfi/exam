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
