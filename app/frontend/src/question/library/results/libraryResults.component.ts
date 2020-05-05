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
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';
import * as _ from 'lodash';

import { Question } from '../../../exam/exam.model';
import { SessionService, User } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { QuestionService } from '../../question.service';
import { LibraryService, LibraryQuestion } from '../library.service';

type SelectableQuestion = LibraryQuestion & { selected: boolean };

@Component({
    selector: 'library-results',
    template: require('./libraryResults.component.html'),
})
export class LibraryResultsComponent implements OnInit, OnChanges {
    @Input() questions: SelectableQuestion[];
    @Input() disableLinks: boolean;
    @Input() tableClass: string;
    @Output() onSelection = new EventEmitter<number[]>();
    @Output() onCopy = new EventEmitter<LibraryQuestion>();

    user: User;
    allSelected = false;
    pageSize = 25;
    currentPage = 0;
    questionsPredicate: string;
    reverse: boolean;

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private Confirmation: ConfirmationDialogService,
        private Question: QuestionService,
        private Library: LibraryService,
        private Attachment: AttachmentService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.user = this.Session.getUser();
        this.tableClass = this.tableClass || 'exams-table';
        const storedData = this.Library.loadFilters('sorting');
        if (storedData.filters) {
            this.questionsPredicate = storedData.filters.predicate;
            this.reverse = storedData.filters.reverse;
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.questions) {
            this.currentPage = 0;
            this.resetSelections();
        }
    }

    onSort = () => this.saveFilters();

    selectAll = () => {
        this.questions.forEach(q => (q.selected = this.allSelected));
        this.questionSelected();
    };

    questionSelected = () => {
        const selections = this.questions.filter(q => q.selected).map(q => q.id);
        this.onSelection.emit(selections);
    };

    deleteQuestion = (question: SelectableQuestion) => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_question_from_library_only'),
        );
        dialog.result.then(() =>
            this.http.delete(this.Question.questionsApi(question.id)).subscribe(() => {
                this.questions.splice(this.questions.indexOf(question), 1);
                toast.info(this.translate.instant('sitnet_question_removed'));
            }),
        );
    };

    copyQuestion = (question: SelectableQuestion) => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_copy_question'),
        );
        dialog.result.then(() =>
            this.http.post<SelectableQuestion>(this.Question.questionCopyApi(question.id), {}).subscribe(copy => {
                this.questions.splice(this.questions.indexOf(question), 0, copy);
                this.onCopy.emit(copy);
            }),
        );
    };

    downloadQuestionAttachment = (question: LibraryQuestion) => this.Attachment.downloadQuestionAttachment(question);

    printOwners = (question: LibraryQuestion) => question.questionOwners.map(o => this.printOwner(o, false)).join(', ');

    printOwner = (owner: User, showId: boolean): string => {
        let user = owner.firstName + ' ' + owner.lastName;
        if (showId && owner.userIdentifier) {
            user += ' (' + owner.userIdentifier + ')';
        }
        return user;
    };

    printTags = (question: LibraryQuestion) => question.tags.map(t => t.name.toUpperCase()).join(', ');

    pageSelected = (page: number) => (this.currentPage = page);

    getQuestionTypeIcon = (question: LibraryQuestion) => {
        switch (question.type) {
            case 'EssayQuestion':
                return 'fa-edit';
            case 'MultipleChoiceQuestion':
                return 'fa-list-ul';
            case 'WeightedMultipleChoiceQuestion':
                return 'fa-balance-scale';
            case 'ClozeTestQuestion':
                return 'fa-terminal';
            case 'ClaimChoiceQuestion':
                return 'fa-list-ol';
        }
        return '';
    };

    getQuestionTypeText = (question: LibraryQuestion) => {
        switch (question.type) {
            case 'EssayQuestion':
                return 'sitnet_essay';
            case 'MultipleChoiceQuestion':
                return 'sitnet_question_mc';
            case 'WeightedMultipleChoiceQuestion':
                return 'sitnet_question_weighted_mc';
            case 'ClozeTestQuestion':
                return 'sitnet_toolbar_cloze_test_question';
            case 'ClaimChoiceQuestion':
                return 'sitnet_toolbar_claim_choice_question';
        }
        return '';
    };

    private saveFilters = () => {
        const filters = {
            predicate: this.questionsPredicate,
            reverse: this.reverse,
        };
        this.Library.storeFilters(filters, 'sorting');
    };

    private resetSelections = () => {
        this.questions.forEach(q => (q.selected = false));
        this.questionSelected();
    };

    private showDisplayedScoreOrTranslate = (scoreColumnValue: string | number) => {
        if(_.isNumber(scoreColumnValue)) {
            return scoreColumnValue;
        } else {
            return this.translate.instant(scoreColumnValue);
        }
    }
}
