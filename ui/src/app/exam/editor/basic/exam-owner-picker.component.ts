// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
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
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule],
    styleUrls: ['../../exam.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamOwnerSelectorComponent {
    exam = input.required<Exam>();

    examOwners = signal<User[]>([]);

    newOwner: {
        id?: number;
        name?: string;
        email?: string;
    };

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    constructor() {
        this.newOwner = {};

        effect(() => {
            const currentExam = this.exam();
            if (currentExam) {
                this.getExamOwners();
            }
        });
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

    nameFormatter(data: User) {
        return `${data.firstName} ${data.lastName} <${data.email}>`;
    }

    setExamOwner(event: NgbTypeaheadSelectItemEvent) {
        this.newOwner.id = event.item.id;
    }

    addExamOwner() {
        if (this.newOwner.id) {
            const currentExam = this.exam();
            this.http.post(`/app/exam/${currentExam.id}/owner/${this.newOwner.id}`, {}).subscribe({
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
    }

    removeOwner(id: number) {
        const currentExam = this.exam();
        this.http.delete(`/app/exam/${currentExam.id}/owner/${id}`).subscribe({
            next: () => this.getExamOwners(),
            error: (err) => this.toast.error(err),
        });
    }

    private getExamOwners() {
        const currentExam = this.exam();
        this.http.get<User[]>(`/app/exam/${currentExam.id}/owners`).subscribe({
            next: (owners) => this.examOwners.set(owners),
            error: (err) => this.toast.error(err),
        });
    }
}
