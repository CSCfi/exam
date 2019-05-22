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
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { User } from '../../../session/session.service';
import { UserService } from '../../../utility/user/user.service';
import { QuestionService } from '../../question.service';


@Component({
    selector: 'library-owner-selection',
    template: require('./libraryOwners.component.html')
})
export class LibraryOwnerSelection implements OnInit {
    @Input() selections: number[];
    @Output() ownerUpdated = new EventEmitter<void>();

    teachers: User[];
    newTeacher: User;

    constructor(
        private translate: TranslateService,
        private Question: QuestionService,
        private User: UserService) { }

    ngOnInit() {
        this.User.listUsersByRole$('TEACHER').subscribe((users: User[]) => {
            this.teachers = users;
        });
    }

    onTeacherSelect = (teacher) => this.newTeacher = teacher;

    addOwnerForSelected = () => {
        // check that atleast one has been selected
        if (this.selections.length === 0) {
            toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
            return;
        }
        if (!this.newTeacher) {
            toast.warning(this.translate.instant('sitnet_add_question_owner'));
            return;
        }

        this.Question.addOwnerForQuestions$(this.newTeacher.id, this.selections).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_question_owner_added'));
                this.ownerUpdated.emit();
            },
            () => toast.info(this.translate.instant('sitnet_update_failed'))
        );
    }

}
