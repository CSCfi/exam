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
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';

import type { Exam } from '../../../exam/exam.model';

@Component({
    template: `
        <div class="bottom-row">
            <div class="col-md-12">
                <button class="btn btn-primary" (click)="listResponses()">{{ 'sitnet_search' | translate }}</button>
            </div>
        </div>
        <div class="top-row">
            <div class="col-md-2">
                <strong>{{ 'sitnet_assessed_exams' | translate }}:</strong>
            </div>
            <div class="col-md-10">{{ assessedExams.length }}</div>
        </div>
        <div class="top-row">
            <div class="col-md-2">
                <strong>{{ 'sitnet_unassessed_exams' | translate }}:</strong>
            </div>
            <div class="col-md-10">{{ unassessedExams.length }}</div>
        </div>
        <div class="top-row">
            <div class="col-md-2">
                <strong>{{ 'sitnet_aborted_exams' | translate }}:</strong>
            </div>
            <div class="col-md-10">{{ abortedExams.length }}</div>
        </div>
    `,
    selector: 'response-statistics',
})
export class ResponseStatisticsComponent implements OnInit {
    @Input() queryParams: { start: string; end: string };
    assessedExams: Exam[] = [];
    unassessedExams: Exam[] = [];
    abortedExams: Exam[] = [];

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.listResponses();
    }

    listResponses = () =>
        this.http.get<Exam[]>('/app/reports/responses', { params: this.queryParams }).subscribe((resp) => {
            this.assessedExams = resp.filter(
                (e) => ['GRADED', 'GRADED_LOGGED', 'ARCHIVED', 'REJECTED', 'DELETED'].indexOf(e.state) > -1,
            );
            this.unassessedExams = resp.filter(
                (e) => ['STUDENT_STARTED', 'REVIEW', 'REVIEW_STARTED'].indexOf(e.state) > -1,
            );
            this.abortedExams = resp.filter((e) => e.state === 'ABORTED');
        });
}
