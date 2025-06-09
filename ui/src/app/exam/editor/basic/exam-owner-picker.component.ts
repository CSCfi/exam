// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

@Component({
    selector: 'xm-exam-owner-picker',
    templateUrl: './exam-owner-picker.component.html',
    standalone: true,
    imports: [NgClass, NgbPopover, FormsModule, NgbTypeahead, TranslateModule],
    styleUrls: ['../../exam.shared.scss'],
})
export class ExamOwnerSelectorComponent implements OnInit {
    @Input() exam!: Exam;

    examOwners: User[] = [];

    newOwner: {
        id?: number;
        name?: string;
        email?: string;
    };

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {
        this.newOwner = {};
    }

    ngOnInit() {
        this.http.get<User[]>(`/app/exam/${this.exam.id}/owners`).subscribe((users) => (this.examOwners = users));
    }

    listOwners$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            tap((text) => (this.newOwner.name = text)),
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

    setExamOwner = (event: NgbTypeaheadSelectItemEvent) => (this.newOwner.id = event.item.id);

    addExamOwner = () => {
        if (this.newOwner.id) {
            this.http.post(`/app/exam/${this.exam.id}/owner/${this.newOwner.id}`, {}).subscribe({
                next: () => {
                    this.getExamOwners();
                    // clear input field
                    delete this.newOwner.email;
                    delete this.newOwner.name;
                    delete this.newOwner.id;
                },
                error: (err) => this.toast.error(err),
            });
        } else {
            this.toast.error(this.translate.instant('i18n_teacher_not_found'));
        }
    };

    removeOwner = (id: number) =>
        this.http
            .delete(`/app/exam/${this.exam.id}/owner/${id}`)
            .subscribe({ next: this.getExamOwners, error: (err) => this.toast.error(err) });

    private getExamOwners = () =>
        this.http
            .get<User[]>(`/app/exam/${this.exam.id}/owners`)
            .subscribe({ next: (owners) => (this.examOwners = owners), error: (err) => this.toast.error(err) });
}
