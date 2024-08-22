// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamInfo, QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    template: `
        <div class="row my-2">
            <div class="col-12">
                <button class="btn btn-primary" (click)="listExams()">{{ 'i18n_search' | translate }}</button>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <strong>{{ 'i18n_most_popular_exams' | translate }}</strong>
            </div>
        </div>
        <div class="row">
            @if (exams.length > 0) {
                <div class="col-12">
                    <table class="table table-striped table-sm">
                        <thead>
                            <tr>
                                <th>{{ 'i18n_rank' | translate }}</th>
                                <th>{{ 'i18n_exam' | translate }}</th>
                                <th>{{ 'i18n_amount_exams' | translate }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (exam of exams; track exam; let i = $index) {
                                <tr>
                                    <td>{{ exam.rank }}.</td>
                                    <td>{{ exam.name }}</td>
                                    <td>{{ exam.participations }}</td>
                                </tr>
                            }
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2">
                                    <strong>{{ 'i18n_total' | translate }}</strong>
                                </td>
                                <td>
                                    @if (exams) {
                                        <strong>{{ totalExams }}</strong>
                                    }
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            }
        </div>
    `,
    selector: 'xm-exam-statistics',
    standalone: true,
    imports: [TranslateModule],
})
export class ExamStatisticsComponent implements OnInit {
    @Input() queryParams: QueryParams = {};

    exams: ExamInfo[] = [];
    totalExams = 0;

    constructor(private Statistics: StatisticsService) {}

    ngOnInit() {
        this.listExams();
    }

    listExams = () =>
        this.Statistics.listExams$(this.queryParams).subscribe((resp) => {
            this.exams = resp
                .map((e) => ({
                    ...e,
                    rank: resp.filter((e2) => e2.participations > e.participations).length + 1,
                }))
                .sort((a, b) => {
                    if (a.rank < b.rank) return -1;
                    else if (a.rank > b.rank) return 1;
                    else return a.name.localeCompare(b.name);
                });
            this.totalExams = this.exams.reduce((a, b) => a + b.participations, 0);
        });
}
