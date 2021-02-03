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
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as toast from 'toastr';

import type { OnInit } from '@angular/core';
import type { AssessedParticipation } from '../enrolment.model';
import type { ExamParticipation } from '../../exam/exam.model';

@Component({
    selector: 'exam-participations',
    templateUrl: './examParticipations.component.html',
    animations: [
        trigger('listAnimation', [
            transition('* <=> *', [
                query(
                    ':enter',
                    [style({ opacity: 0 }), stagger('60ms', animate('600ms ease-out', style({ opacity: 1 })))],
                    { optional: true },
                ),
                query(':leave', animate('100ms', style({ opacity: 0 })), { optional: true }),
            ]),
        ]),
    ],
})
export class ExamParticipationsComponent implements OnInit {
    filter = { ordering: '-ended', text: '' };
    pageSize = 10;
    currentPage = 0;
    participations: ExamParticipation[];
    collaborative = false;
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(private http: HttpClient) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this.doSearch);
    }

    ngOnInit() {
        this.search('');
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    search = (text: string) => this.filterChanged.next(text);

    private doSearch = (text: string) => {
        this.filter.text = text;
        this.http
            .get<AssessedParticipation[]>('/app/student/finishedexams', { params: { filter: text } })
            .subscribe(
                (data) => {
                    data.filter((p) => !p.ended).forEach(
                        (p) =>
                            (p.ended = p.reservation
                                ? p.reservation.endAt
                                : moment(p.examinationEvent?.start).add(p.duration, 'minutes').format()),
                    );
                    this.participations = data;
                },
                (err) => toast.error(err.data),
            );
    };

    pageSelected = ($event: { page: number }) => (this.currentPage = $event.page);
}
