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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { User } from '../../../session/session.service';
import type { Exam, ExamInspection } from '../../exam.model';

@Component({
    selector: 'xm-exam-inspector-picker',
    templateUrl: './exam-inspector-picker.component.html',
    standalone: true,
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule],
})
export class ExamInspectorSelectorComponent implements OnInit {
    @Input() exam!: Exam;
    examInspections: ExamInspection[] = [];
    newInspector: {
        id?: number;
        sendMessage?: boolean;
        comment?: string;
        name?: string;
        email?: string;
    };

    constructor(
        private http: HttpClient,
        private toast: ToastrService,
    ) {
        this.newInspector = {};
    }

    ngOnInit() {
        this.getInspectors();
    }

    listInspectors$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            tap((text) => (this.newInspector.name = text)),
            debounceTime(500),
            distinctUntilChanged(),
            exhaustMap((text) =>
                text.length < 2
                    ? of([])
                    : this.http.get<User[]>(`/app/users/filter/TEACHER/${this.exam.id}`, { params: { q: text } }),
            ),
            take(15),
            catchError((err) => {
                this.toast.error(err);
                return throwError(() => new Error(err));
            }),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name} ${data.email}`;

    setInspector = (event: NgbTypeaheadSelectItemEvent) => (this.newInspector.id = event.item.id);

    addInspector = () => {
        if (this.newInspector.id) {
            this.http
                .post(`/app/exams/${this.exam.id}/inspector/${this.newInspector.id}`, {
                    comment: this.newInspector.comment,
                })
                .subscribe(() => {
                    this.getInspectors();
                    this.newInspector = {};
                });
        }
    };

    removeInspector = (id: number) =>
        this.http
            .delete(`/app/exams/inspector/${id}`)
            .subscribe({ next: this.getInspectors, error: (err) => this.toast.error(err) });

    private getInspectors = () =>
        this.http.get<ExamInspection[]>(`/app/exam/${this.exam.id}/inspections`).subscribe({
            next: (inspections) => (this.examInspections = inspections),
            error: (err) => this.toast.error(err),
        });
}
