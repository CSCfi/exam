// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { Exam, ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { UserService } from 'src/app/shared/user/user.service';

@Component({
    selector: 'xm-exam-inspector-picker',
    templateUrl: './exam-inspector-picker.component.html',
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule, NgClass],
    styles: '.vbottom { vertical-align: bottom !important }',
    styleUrls: ['../../exam.shared.scss'],
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

    private http = inject(HttpClient);
    private toast = inject(ToastrService);
    private User = inject(UserService);

    constructor() {
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
                text.length < 2 ? of([]) : this.http.get<User[]>(`/app/users/teachers`, { params: { q: text } }),
            ),
            take(15),
            catchError((err) => {
                this.toast.error(err);
                return throwError(() => new Error(err));
            }),
        );

    nameFormatter = (data: User) => `${data.firstName} ${data.lastName} <${data.email}>`;

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
