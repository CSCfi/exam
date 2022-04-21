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
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { isNumber, isString } from 'lodash';
import { ToastrService } from 'ngx-toastr';
import type { Question } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
import { SessionService } from '../../../session/session.service';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import type { LibraryQuestion } from '../library.service';
import { LibraryService } from '../library.service';

type SelectableQuestion = LibraryQuestion & { selected: boolean };

@Component({
    selector: 'library-results',
    templateUrl: './library-results.component.html',
})
export class LibraryResultsComponent implements OnInit, OnChanges {
    @Input() questions: Question[] = [];
    @Input() disableLinks = false;
    @Input() tableClass = '';
    @Output() selected = new EventEmitter<number[]>();
    @Output() copied = new EventEmitter<LibraryQuestion>();

    user: User;
    allSelected = false;
    pageSize = 25;
    currentPage = 0;
    questionsPredicate = '';
    reverse = false;
    fixedQuestions: SelectableQuestion[] = [];

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private Library: LibraryService,
        private Attachment: AttachmentService,
        private Session: SessionService,
    ) {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        this.fixedQuestions = this.questions as SelectableQuestion[]; // FIXME: ugly cast, should resolve this better
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
            this.fixedQuestions = this.questions as SelectableQuestion[];
        }
    }

    selectAll = () => {
        this.fixedQuestions.forEach((q) => (q.selected = this.allSelected));
        this.questionSelected();
    };

    questionSelected = () => {
        const selections = this.fixedQuestions.filter((q) => q.selected).map((q) => q.id);
        this.selected.emit(selections);
    };

    deleteQuestion = (question: SelectableQuestion) => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_question_from_library_only'),
        );
        dialog.result.then(() =>
            this.http.delete(`/app/questions/${question.id}`).subscribe(() => {
                this.questions.splice(this.questions.indexOf(question), 1);
                this.toast.info(this.translate.instant('sitnet_question_removed'));
            }),
        );
    };

    copyQuestion = (question: SelectableQuestion) => {
        const dialog = this.Confirmation.open(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_copy_question'),
        );
        dialog.result.then(() =>
            this.http.post<SelectableQuestion>(`/app/question/${question.id}`, {}).subscribe((copy) => {
                this.questions.splice(this.questions.indexOf(question), 0, copy);
                this.copied.emit(copy);
            }),
        );
    };

    downloadQuestionAttachment = (question: LibraryQuestion) => this.Attachment.downloadQuestionAttachment(question);

    printOwners = (question: LibraryQuestion) =>
        question.questionOwners.map((o) => this.printOwner(o, false)).join(', ');

    renderMailTo = (owner?: User) => {
        if (!(owner && owner.email)) {
            return '';
        }

        return `mailto:${owner.email}`;
    };

    printOwner = (owner: User, showId: boolean): string => {
        if (!owner) {
            return '';
        }

        let user = owner.firstName + ' ' + owner.lastName;
        if (showId && owner.userIdentifier) {
            user += ' (' + owner.userIdentifier + ')';
        }
        return user;
    };

    printTags = (question: LibraryQuestion) => question.tags.map((t) => t.name.toUpperCase()).join(', ');

    pageSelected = (event: { page: number }) => (this.currentPage = event.page);

    setPredicate = (predicate: string) => {
        if (this.questionsPredicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.questionsPredicate = predicate;
        this.saveFilters();
    };

    getQuestionTypeIcon = (question: LibraryQuestion) => {
        switch (question.type) {
            case 'EssayQuestion':
                return 'bi-pencil';
            case 'MultipleChoiceQuestion':
                return 'bi-ui-radios';
            case 'WeightedMultipleChoiceQuestion':
                return 'bi-check-2-square';
            case 'ClozeTestQuestion':
                return 'bi-pencil-check';
            case 'ClaimChoiceQuestion':
                return 'bi-file-binary';
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
        this.fixedQuestions.forEach((q) => (q.selected = false));
        this.questionSelected();
    };

    showDisplayedScoreOrTranslate = (scoreColumnValue: string | number) => {
        if (isNumber(scoreColumnValue)) {
            return scoreColumnValue;
        } else if (isString(scoreColumnValue) && scoreColumnValue !== '') {
            return this.translate.instant(scoreColumnValue);
        } else {
            return '';
        }
    };
}
