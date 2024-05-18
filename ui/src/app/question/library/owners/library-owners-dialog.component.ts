// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.service';
import { UserService } from 'src/app/shared/user/user.service';

@Component({
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_add_question_owner' | translate }}</h1>
        </div>
        <div class="modal-body">
            <div class="form-group input-group">
                <input
                    class="form-control"
                    [ngbTypeahead]="listTeachers$"
                    (selectItem)="setQuestionOwner($event)"
                    [inputFormatter]="nameFormatter"
                    [resultFormatter]="nameFormatter"
                />

                <button class="btn btn-success" (click)="addOwnerForSelected()">
                    {{ 'i18n_add' | translate }}
                </button>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" (click)="close()" autofocus>
                {{ 'i18n_close' | translate }}
            </button>
        </div>
    `,
    selector: 'xm-library-owners-dialog',
    standalone: true,
    imports: [NgbTypeahead, TranslateModule],
})
export class LibraryOwnersDialogComponent implements OnInit {
    @Input() selections: number[] = [];

    teachers: User[] = [];
    newTeachers: number[] = [];
    selectedTeacherId?: number;

    constructor(
        public activeModal: NgbActiveModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private Question: QuestionService,
        private User: UserService,
    ) {}

    ngOnInit() {
        this.User.listUsersByRole$('TEACHER').subscribe((users: User[]) => {
            this.teachers = users;
        });
    }

    listTeachers$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            debounceTime(100),
            distinctUntilChanged(),
            map((text) => (text.length < 2 ? [] : this.filterByName(this.teachers, text))),
            take(8),
            catchError((err) => {
                this.toast.error(err.data);
                return throwError(() => new Error(err));
            }),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name}${data.email ? ' ' + data.email : ''}`;

    setQuestionOwner = (event: NgbTypeaheadSelectItemEvent) => (this.selectedTeacherId = event.item.id);

    addOwnerForSelected = () => {
        // check that atleast one has been selected
        if (!this.selectedTeacherId) {
            this.toast.warning(this.translate.instant('i18n_add_question_owner'));
            return;
        }

        this.Question.addOwnerForQuestions$(this.selectedTeacherId, this.selections).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_question_owner_added'));
                this.newTeachers.push(this.selectedTeacherId as number);
            },
            error: () => this.toast.error(this.translate.instant('i18n_update_failed')),
        });
    };

    close = () =>
        this.activeModal.close({
            questions: this.selections,
            users: this.teachers.filter((t) => this.newTeachers.includes(t.id)),
        });

    private filterByName = (src: User[], q: string): User[] => {
        if (!q) return src;
        return src.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(q.toLowerCase()));
    };
}
