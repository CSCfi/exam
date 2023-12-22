import { NgFor, NgIf } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamInfo, QueryParams } from '../statistics.service';
import { StatisticsService } from '../statistics.service';

@Component({
    template: `
        <div class="detail-row">
            <div class="col-md-12">
                <button class="btn btn-primary" (click)="listExams()">{{ 'i18n_search' | translate }}</button>
            </div>
        </div>
        <div class="top-row">
            <div class="col-md-12">
                <h3>{{ 'i18n_most_popular_exams' | translate }}</h3>
            </div>
        </div>
        <div class="detail-row">
            <div class="col-md-12" *ngIf="exams.length > 0">
                <table class="table table-striped table-sm">
                    <thead>
                        <tr>
                            <th>{{ 'i18n_rank' | translate }}</th>
                            <th>{{ 'i18n_exam' | translate }}</th>
                            <th>{{ 'i18n_amount_exams' | translate }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let exam of exams; let i = index">
                            <td>{{ getRank(i, exams) }}.</td>
                            <td>{{ exam.name }}</td>
                            <td>{{ exam.participations }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2">
                                <b>{{ 'i18n_total' | translate }}</b>
                            </td>
                            <td>
                                <b *ngIf="exams">{{ totalExams() }}</b>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `,
    selector: 'xm-exam-statistics',
    standalone: true,
    imports: [NgIf, NgFor, TranslateModule],
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
