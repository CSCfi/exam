/*
 * Copyright (c) 2017 Exam Consortium
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
import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as toast from 'toastr';

import { ExamParticipation } from '../enrolment.model';

@Component({
    selector: 'exam-participations',
    template: require('./examParticipations.component.html'),
})
export class ExamParticipationsComponent implements OnInit {
    filter = { ordering: '-ended', text: '' };
    pageSize = 10;
    currentPage: number;
    participations: ExamParticipation[];
    filterChanged: Subject<string> = new Subject<string>();

    constructor(private http: HttpClient) {
        this.filterChanged
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
            )
            .subscribe(this.doSearch);
    }

    ngOnInit() {
        this.search('');
    }

    search = (text: string) => this.filterChanged.next(text);

    private doSearch = (text: string) => {
        this.filter.text = text;
        this.http.get<ExamParticipation[]>('/app/student/finishedexams', { params: { filter: text } }).subscribe(
            data => {
                data.filter(p => !p.ended).forEach(p => (p.ended = p.reservation.endAt));
                this.participations = data;
            },
            err => toast.error(err.data),
        );
    };

    pageSelected = (page: number) => (this.currentPage = page);
}
