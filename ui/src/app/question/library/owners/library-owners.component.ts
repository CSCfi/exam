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
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';
import type { User } from '../../../session/session.service';
import { UserService } from '../../../shared/user/user.service';
import { QuestionService } from '../../question.service';

@Component({
    selector: 'xm-library-owner-selection',
    template: ` <div class="make-inline">
        <div class="question-add-owners-box">
            <span class="padl10">
                <i class="bi-person-circle" style="color: #266b99"></i>&nbsp;
                <a class="infolink pointer" (click)="showOwnerSelection = !showOwnerSelection">
                    {{ 'sitnet_add_question_owner' | translate }}</a
                >
            </span>
            <div [hidden]="!showOwnerSelection">
                <div class="input-group">
                    <input
                        class="form-control question-add-owners"
                        placeholder="{{ 'sitnet_add_question_owner' | translate }}"
                        [ngbTypeahead]="listTeachers$"
                        (selectItem)="setQuestionOwner($event)"
                        [inputFormatter]="nameFormatter"
                        [resultFormatter]="nameFormatter"
                    />
                </div>
                <div class="col-md-2 bottom-padding-2 padl10">
                    <input
                        type="button"
                        class="btn green border-green whitetext"
                        (click)="addOwnerForSelected()"
                        value="{{ 'sitnet_add' | translate }}"
                    />
                </div>
            </div>
        </div>
    </div>`,
})
export class LibraryOwnersComponent implements OnInit {
    @Input() selections: number[] = [];
    @Output() selected = new EventEmitter<{ user: User; selections: number[] }>();

    showOwnerSelection = false;
    teachers: User[] = [];
    selectedTeacherId?: number;

    constructor(
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
        if (this.selections.length === 0) {
            this.toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
            return;
        }
        if (!this.selectedTeacherId) {
            this.toast.warning(this.translate.instant('sitnet_add_question_owner'));
            return;
        }

        this.Question.addOwnerForQuestions$(this.selectedTeacherId, this.selections).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('sitnet_question_owner_added'));
                this.selected.emit({
                    user: this.teachers.find((t) => t.id === this.selectedTeacherId) as User,
                    selections: this.selections,
                });
            },
            error: () => this.toast.error(this.translate.instant('sitnet_update_failed')),
        });
    };

    private filterByName = (src: User[], q: string): User[] => {
        if (!q) return src;
        return src.filter((u) => u.name && u.name.toLowerCase().includes(q.toLowerCase()));
    };
}
