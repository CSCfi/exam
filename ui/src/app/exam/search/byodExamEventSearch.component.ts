/*
 * Copyright (c) 2018 Exam Consortium
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
import { Component } from '@angular/core';

import type { OnInit } from '@angular/core';

import { animate, query, stagger, style, transition, trigger } from '@angular/animations';

import { addDays } from 'date-fns';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExaminationEventConfiguration } from '../exam.model';

@Component({
    selector: 'byod-exam-event-search',
    templateUrl: './byodExamEventSearch.component.html',
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
export class ByodExamEventSearchComponent implements OnInit {
    private startDate: Date | null = null;
    private endDate: Date | null = null;
    public processedEvents: ExaminationEventConfiguration[] = [];

    sorting = {
        predicate: 'exam.created',
        reverse: true,
    };
    filterText = '';

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.query();
    }

    query = () => {
        if (!this.startDate || !this.endDate) return;
        const params: { start?: string; end?: string } = {};
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        if (this.startDate) {
            params.start = new Date(this.startDate.getTime() + tzOffset).toISOString();
        }
        if (this.endDate) {
            params.end = addDays(this.endDate, 1).toISOString();
        }
        this.httpQuery(params).subscribe((resp: ExaminationEventConfiguration[]) => {
            this.processedEvents = resp
                .map((i: ExaminationEventConfiguration) =>
                    Object.assign(i, {
                        id: i.examinationEvent.id,
                        exam: i.exam,
                        settingsPassword: i.settingsPassword,
                        examinationEvent: i.examinationEvent
                            ? {
                                  id: i.examinationEvent.id,
                                  start: i.examinationEvent.start,
                                  description: i.examinationEvent.description,
                                  capacity: i.examinationEvent.capacity,
                                  examinationEventConfiguration: i.examinationEvent.examinationEventConfiguration,
                              }
                            : undefined,
                        examEnrolments: i.examEnrolments,
                    }),
                )
                .filter((e) => this.examToString(e).toLowerCase().match(this.filterText.toLowerCase()));
        });
    };

    httpQuery = (
        params: { start?: string; end?: string } | { month?: string },
    ): Observable<ExaminationEventConfiguration[]> =>
        this.http.get<ExaminationEventConfiguration[]>('/app/examinationevents', { params: params as HttpParams });

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
        this.query();
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
        this.query();
    };

    getEventEndTime = (start?: string, duration?: number): string => {
        if (!start || !duration) return '';
        const startDate = new Date(start);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        return endDate.toString();
    };

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    };

    private examToString = (eec: ExaminationEventConfiguration) => {
        const code = eec.id || '';
        const name = eec.exam?.name || '';
        const teacher = (eec.exam?.creator.firstName || '') + eec.exam?.creator.lastName || '';
        return code + name + teacher;
    };
}
