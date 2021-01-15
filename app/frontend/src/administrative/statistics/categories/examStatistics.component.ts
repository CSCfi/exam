import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';

interface ExamInfo {
    name: string;
    participations: number;
    state: string;
    rank: number;
}

@Component({
    template: `
        <div class="detail-row">
            <div class="col-md-12">
                <button class="btn btn-primary" (click)="listExams()">{{ 'sitnet_search' | translate }}</button>
            </div>
        </div>
        <div class="top-row">
            <div class="col-md-12">
                <h3>{{ 'sitnet_most_popular_exams' | translate }}</h3>
            </div>
        </div>
        <div class="detail-row">
            <div class="col-md-12" *ngIf="exams.length > 0">
                <table class="table table-striped table-condensed">
                    <thead>
                        <tr>
                            <th>{{ 'sitnet_rank' | translate }}</th>
                            <th>{{ 'sitnet_exam' | translate }}</th>
                            <th>{{ 'sitnet_amount_exams' | translate }}</th>
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
                                <b>{{ 'sitnet_total' | translate }}</b>
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
    selector: 'exam-statistics',
})
export class ExamStatisticsComponent implements OnInit {
    @Input() queryParams: { start: string; end: string };
    exams: ExamInfo[] = [];

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.listExams();
    }

    totalExams = () => this.exams.reduce((a, b) => a + b.participations, 0);

    listExams = () =>
        this.http
            .get<ExamInfo[]>('/app/reports/exams', { params: this.queryParams })
            .toPromise()
            .then(resp => {
                if (!resp) {
                    return;
                }
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
