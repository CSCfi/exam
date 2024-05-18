// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, Input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { QueryParams } from 'src/app/administrative/statistics/statistics.service';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    template: `
        <div class="row my-2">
            <div class="col-12">
                <button class="btn btn-primary" (click)="listResponses()">{{ 'i18n_search' | translate }}</button>
            </div>
        </div>
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
    `,
    selector: 'xm-response-statistics',
    standalone: true,
    imports: [TranslateModule],
})
export class ResponseStatisticsComponent implements OnInit {
    @Input() queryParams: QueryParams = {};

    data = signal({ assessed: 0, unAssessed: 0, aborted: 0 });

    constructor(private Statistics: StatisticsService) {}

    ngOnInit() {
        this.listResponses();
    }

    listResponses = () => this.Statistics.listResponses$(this.queryParams).subscribe((resp) => this.data.set(resp));
}
