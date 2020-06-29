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
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Observable, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, take, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { User } from '../../../session/session.service';
import { UserService } from '../../../utility/user/user.service';
import { QuestionService } from '../../question.service';

@Component({
    selector: 'library-owner-selection',
    template: require('./libraryOwners.component.html'),
})
export class LibraryOwnerSelection implements OnInit {
    @Input() selections: number[];
    showOwnerSelection = false;

    teachers: User[];
    selectedTeacherId: number | undefined;

    constructor(private translate: TranslateService, private Question: QuestionService, private User: UserService) {}

    ngOnInit() {
        this.User.listUsersByRole$('TEACHER').subscribe((users: User[]) => {
            this.teachers = users;
        });
    }

    private filterByName = (src: User[], q: string): User[] => {
        if (!q) return src;
        return src.filter(u => u.name && u.name.toLowerCase().includes(q.toLowerCase()));
    };

    listTeachers$ = (criteria$: Observable<string>): Observable<User[]> =>
        criteria$.pipe(
            debounceTime(100),
            distinctUntilChanged(),
            map(text => (text.length < 2 ? [] : this.filterByName(this.teachers, text))),
            take(8),
            catchError(err => {
                toast.error(err.data);
                return throwError(err);
            }),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name}${data.email ? ' ' + data.email : ''}`;

    setQuestionOwner = (event: NgbTypeaheadSelectItemEvent) => (this.selectedTeacherId = event.item.id);

    addOwnerForSelected = () => {
        // check that atleast one has been selected
        if (this.selections.length === 0) {
            toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
            return;
        }
        if (!this.selectedTeacherId) {
            toast.warning(this.translate.instant('sitnet_add_question_owner'));
            return;
        }

        this.Question.addOwnerForQuestions$(this.selectedTeacherId, this.selections).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_question_owner_added'));
            },
            () => toast.info(this.translate.instant('sitnet_update_failed')),
        );
    };
}
