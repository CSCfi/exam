// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs/operators';
import { ExamInfo, QueryParams } from 'src/app/administrative/administrative.model';
import { StatisticsService } from 'src/app/administrative/statistics/statistics.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (queryParams()) {
            <div class="row">
                <div class="col-12">
                    <strong>{{ 'i18n_most_popular_exams' | translate }}</strong>
                </div>
            </div>
            @if (exams().length > 0) {
                <div class="row">
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
                                @for (exam of exams(); track exam; let i = $index) {
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
                                        <strong>{{ totalExams() }}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            }
        }
    `,
    selector: 'xm-exam-statistics',
    imports: [TranslateModule],
})
export class ExamStatisticsComponent {
    readonly queryParams = input<QueryParams | null>(null);
    readonly exams = signal<ExamInfo[]>([]);
    readonly totalExams = computed(() => this.exams().reduce((a, b) => a + b.participations, 0));

    private readonly Statistics = inject(StatisticsService);

    constructor() {
        toObservable(this.queryParams)
            .pipe(
                filter((params): params is QueryParams => !!params?.start && !!params?.end),
                switchMap((params) => this.Statistics.listExams$(params)),
                takeUntilDestroyed(),
            )
            .subscribe((resp) => {
                const rankedExams = resp
                    .map((e) => ({
                        ...e,
                        rank: resp.filter((e2) => e2.participations > e.participations).length + 1,
                    }))
                    .sort((a, b) => {
                        if (a.rank < b.rank) return -1;
                        else if (a.rank > b.rank) return 1;
                        else return a.name.localeCompare(b.name);
                    });
                this.exams.set(rankedExams);
            });
    }
}
