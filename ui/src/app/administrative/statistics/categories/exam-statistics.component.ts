import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamInfo, QueryParams } from '../statistics.service';
import { StatisticsService } from '../statistics.service';

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
                                    <td>{{ getRank(i, exams) }}.</td>
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
                                        <strong>{{ totalExams() }}</strong>
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

    constructor(private Statistics: StatisticsService) {}

    ngOnInit() {
        this.listExams();
    }

    totalExams = () => this.exams.reduce((a, b) => a + b.participations, 0);

    listExams = () =>
        this.Statistics.listExams$(this.queryParams).subscribe((resp) => {
            this.exams = resp.sort((a, b) => {
                if (a.participations > b.participations) return -1;
                else if (a.participations < b.participations) return 1;

                if (a.name > b.name) return 1;
                else if (a.name < b.name) return -1;

                return 0;
            });
        });

    getRank = (index: number, items: ExamInfo[]) => {
        const prev = Math.max(0, index - 1);
        if (items[prev].participations === items[index].participations) {
            items[index].rank = items[prev].rank || 0;
            return (items[prev].rank || 0) + 1;
        }
        items[index].rank = index;
        return index + 1;
    };
}
