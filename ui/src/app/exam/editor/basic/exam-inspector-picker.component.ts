// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, take } from 'rxjs/operators';
import type { Exam, ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';

interface NewInspector {
    id?: number;
    sendMessage?: boolean;
    comment?: string;
}

@Component({
    selector: 'xm-exam-inspector-picker',
    templateUrl: './exam-inspector-picker.component.html',
    imports: [NgbPopover, FormsModule, NgbTypeahead, TranslateModule],
    styles: '.vbottom { vertical-align: bottom !important }',
    styleUrls: ['../../exam.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamInspectorSelectorComponent implements OnInit {
    readonly exam = input.required<Exam>();
    readonly examInspections = signal<ExamInspection[]>([]);
    readonly newInspector = signal<NewInspector>({});
    inspectorName = '';

    private readonly http = inject(HttpClient);
    private readonly toast = inject(ToastrService);

    ngOnInit() {
        this.getInspectors();
    }

    listInspectors$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
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

    nameFormatter = (data: User | string) =>
        typeof data === 'string' ? data : `${data.firstName} ${data.lastName} <${data.email}>`;

    setInspector(event: NgbTypeaheadSelectItemEvent) {
        this.newInspector.update((i) => ({ ...i, id: event.item.id }));
    }

    onSendMessageChange(event: Event) {
        this.newInspector.update((i) => ({ ...i, sendMessage: (event.target as HTMLInputElement).checked }));
    }

    onCommentInput(event: Event) {
        this.newInspector.update((i) => ({ ...i, comment: (event.target as HTMLTextAreaElement).value }));
    }

    addInspector() {
        const inspector = this.newInspector();
        if (inspector.id) {
            const currentExam = this.exam();
            this.http
                .post(`/app/exams/${currentExam.id}/inspector/${inspector.id}`, {
                    comment: inspector.comment,
                })
                .subscribe(() => {
                    this.getInspectors();
                    this.newInspector.set({});
                    this.inspectorName = '';
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
