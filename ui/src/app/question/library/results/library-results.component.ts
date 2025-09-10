// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { LibraryService } from 'src/app/question/library/library.service';
import { LibraryQuestion, Question } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { MathUnifiedDirective } from 'src/app/shared/math/math-unified.directive';
import { isNumber, isString } from 'src/app/shared/miscellaneous/helpers';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

type SelectableQuestion = LibraryQuestion & { selected: boolean };

@Component({
    selector: 'xm-library-results',
    templateUrl: './library-results.component.html',
    imports: [
        FormsModule,
        NgbPopover,
        TableSortComponent,
        MathUnifiedDirective,
        RouterLink,
        PaginatorComponent,
        SlicePipe,
        DatePipe,
        TranslateModule,
        PageFillPipe,
        OrderByPipe,
        MathUnifiedDirective,
    ],
    styleUrls: ['../library.component.scss'],
})
export class LibraryResultsComponent implements OnInit, OnChanges {
    @Input() questions: Question[] = [];
    @Input() disableLinks = false;
    @Output() selected = new EventEmitter<number[]>();
    @Output() copied = new EventEmitter<LibraryQuestion>();

    user: User;
    allSelected = false;
    pageSize = 25;
    currentPage = 0;
    questionsPredicate = '';
    reverse = false;
    fixedQuestions: SelectableQuestion[] = [];

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Confirmation = inject(ConfirmationDialogService);
    private Library = inject(LibraryService);
    private Attachment = inject(AttachmentService);
    private Session = inject(SessionService);

    constructor() {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        this.fixedQuestions = this.questions as SelectableQuestion[]; // FIXME: ugly cast, should resolve this better
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

    deleteQuestion = (question: SelectableQuestion) =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_remove_question_from_library_only'),
        ).subscribe({
            next: () =>
                this.http.delete(`/app/questions/${question.id}`).subscribe({
                    next: () => this.questions.splice(this.questions.indexOf(question), 1),
                    error: () => this.toast.info(this.translate.instant('i18n_question_removed')),
                }),
        });

    copyQuestion = (question: SelectableQuestion) =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_copy_question'),
        ).subscribe({
            next: () =>
                this.http.post<SelectableQuestion>(`/app/question/${question.id}`, {}).subscribe({
                    next: (copy) => {
                        this.questions.splice(this.questions.indexOf(question), 0, copy);
                        this.copied.emit(copy);
                    },
                    error: (err) => this.toast.error(err),
                }),
        });

    downloadQuestionAttachment = (question: LibraryQuestion) => this.Attachment.downloadQuestionAttachment(question);

    printOwners = (question: LibraryQuestion) =>
        question.questionOwners.map((o) => this.printOwner(o, false)).join(', ');

    renderMailTo = (owner?: User) => (owner?.email ? `mailto:${owner.email}` : '');

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

    printTags = (question: LibraryQuestion) => {
        const ownTags = question.tags.filter((t) => t.creator?.id === this.user.id);
        return ownTags.map((t) => t.name).join(', ');
    };

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
                return 'i18n_essay';
            case 'MultipleChoiceQuestion':
                return 'i18n_question_mc';
            case 'WeightedMultipleChoiceQuestion':
                return 'i18n_question_weighted_mc';
            case 'ClozeTestQuestion':
                return 'i18n_toolbar_cloze_test_question';
            case 'ClaimChoiceQuestion':
                return 'i18n_toolbar_claim_choice_question';
        }
        return '';
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
}
