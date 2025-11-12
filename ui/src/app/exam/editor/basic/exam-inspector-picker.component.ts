// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, take, tap } from 'rxjs/operators';
import type { Exam, ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

@Component({
    selector: 'xm-exam-inspector-picker',
    templateUrl: './exam-inspector-picker.component.html',
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule],
    styles: '.vbottom { vertical-align: bottom !important }',
    styleUrls: ['../../exam.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamInspectorSelectorComponent {
    exam = input.required<Exam>();
    examInspections = signal<ExamInspection[]>([]);
    newInspector: {
        id?: number;
        sendMessage?: boolean;
        comment?: string;
        name?: string;
        email?: string;
    };

    private http = inject(HttpClient);
    private toast = inject(ToastrService);

    constructor() {
        this.newInspector = {};

        effect(() => {
            const currentExam = this.exam();
            if (currentExam) {
                this.getInspectors();
            }
        });
    }

    listInspectors$(criteria$: Observable<string>): Observable<User[]> {
        return criteria$.pipe(
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
    }

    nameFormatter(data: User) {
        return `${data.firstName} ${data.lastName} <${data.email}>`;
    }

    setInspector(event: NgbTypeaheadSelectItemEvent) {
        this.newInspector.id = event.item.id;
    }

    addInspector() {
        if (this.newInspector.id) {
            const currentExam = this.exam();
            this.http
                .post(`/app/exams/${currentExam.id}/inspector/${this.newInspector.id}`, {
                    comment: this.newInspector.comment,
                })
                .subscribe(() => {
                    this.getInspectors();
                    this.newInspector = {};
                });
        }
    }

    removeInspector(id: number) {
        this.http.delete(`/app/exams/inspector/${id}`).subscribe({
            next: () => this.getInspectors(),
            error: (err) => this.toast.error(err),
        });
    }

    private getInspectors() {
        const currentExam = this.exam();
        this.http.get<ExamInspection[]>(`/app/exam/${currentExam.id}/inspections`).subscribe({
            next: (inspections) => this.examInspections.set(inspections),
            error: (err) => this.toast.error(err),
        });
    }
}
