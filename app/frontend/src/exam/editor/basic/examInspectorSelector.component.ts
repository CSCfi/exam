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
import { Component, Input, OnInit } from '@angular/core';
import { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { User } from '../../../session/session.service';
import { Exam, ExamInspection } from '../../exam.model';

@Component({
    selector: 'exam-inspector-selector',
    template: require('./examInspectorSelector.component.html'),
})
export class ExamInspectorSelectorComponent implements OnInit {
    @Input() exam: Exam;

    examInspections: ExamInspection[];

    newInspector: {
        id: number;
        sendMessage: boolean;
        comment: string;
        name: string;
        email: string;
    };

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.getInspectors();
    }

    private getInspectors = () =>
        this.http
            .get<ExamInspection[]>(`/app/exam/${this.exam.id}/inspections`)
            .subscribe(inspections => (this.examInspections = inspections), err => toast.error(err.data));

    listInspectors$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            tap(text => (this.newInspector.name = text)),
            debounceTime(500),
            distinctUntilChanged(),
            exhaustMap(text =>
                text.length < 2
                    ? of([])
                    : this.http.get<User[]>(`/app/users/filter/TEACHER/${this.exam.id}`, { params: { q: text } }),
            ),
            take(15),
            catchError(err => {
                toast.error(err.data);
                return throwError(err);
            }),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name} ${data.email}`;

    setInspector = (event: NgbTypeaheadSelectItemEvent) => (this.newInspector.id = event.item.id);

    removeInspector = (id: number) =>
        this.http
            .delete(`/app/exams/inspector/${id}`)
            .subscribe(() => this.getInspectors(), err => toast.error(err.data));
}
