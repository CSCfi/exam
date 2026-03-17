// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { skip } from 'rxjs';
import { LibraryService } from 'src/app/question/library/library.service';
import { LibraryQuestion } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
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
        NgbPopover,
        TableSortComponent,
        MathDirective,
        RouterLink,
        PaginatorComponent,
        SlicePipe,
        DatePipe,
        TranslateModule,
        PageFillPipe,
        OrderByPipe,
    ],
    styleUrls: ['../library.component.scss'],
})
export class LibraryResultsComponent {
    readonly questions = input<LibraryQuestion[]>([]);
    readonly disableLinks = input(false);
    readonly selected = output<number[]>();
    readonly copied = output<LibraryQuestion>();

    readonly allSelected = signal(false);
    // FIXME: ugly cast, should resolve this better
    readonly fixedQuestions = linkedSignal<SelectableQuestion[]>(() => this.questions() as SelectableQuestion[]);
    readonly currentPage = linkedSignal<number>(() => {
        void this.questions();
        return 0;
    });
    readonly questionsPredicate = signal('');
    readonly reverse = signal(false);

    readonly user: User;
    readonly pageSize = 25;

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Confirmation = inject(ConfirmationDialogService);
    private readonly Library = inject(LibraryService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Session = inject(SessionService);

    constructor() {
        this.user = this.Session.getUser();

        // Load stored filters
        const storedData = this.Library.loadFilters('sorting');
        if (storedData.filters) {
            this.questionsPredicate.set(storedData.filters.predicate);
            this.reverse.set(storedData.filters.reverse);
        }

        toObservable(this.questions)
            .pipe(skip(1), takeUntilDestroyed())
            .subscribe(() => this.selected.emit([]));
    }

    onSelectAll = (event: Event) => {
        this.allSelected.set((event.target as HTMLInputElement).checked);
        this.selectAll();
    };

    onQuestionToggle = (question: SelectableQuestion, event: Event) => {
        question.selected = (event.target as HTMLInputElement).checked;
        this.questionSelected();
    };

    selectAll = () => {
        this.fixedQuestions().forEach((q) => (q.selected = this.allSelected()));
        this.questionSelected();
    };

    questionSelected = () => {
        const selections = this.fixedQuestions()
            .filter((q) => q.selected && q.id !== undefined)
            .map((q) => q.id!);
        this.selected.emit(selections);
    };

    deleteQuestion = (question: SelectableQuestion) =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_remove_question_from_library_only'),
        ).subscribe({
            next: () => {
                const questionsValue = this.questions();
                this.http.delete(`/app/questions/${question.id}`).subscribe({
                    next: () => {
                        const index = questionsValue.indexOf(question);
                        if (index > -1) {
                            questionsValue.splice(index, 1);
                            // Update fixedQuestions to reflect the change
                            this.fixedQuestions.set(questionsValue as SelectableQuestion[]);
                        }
                    },
                    error: () => this.toast.info(this.translate.instant('i18n_question_removed')),
                });
            },
        });

    copyQuestion = (question: SelectableQuestion) =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_copy_question'),
        ).subscribe({
            next: () => {
                const questionsValue = this.questions();
                this.http.post<SelectableQuestion>(`/app/question/${question.id}`, {}).subscribe({
                    next: (copy) => {
                        const index = questionsValue.indexOf(question);
                        questionsValue.splice(index > -1 ? index : 0, 0, copy);
                        // Update fixedQuestions to reflect the change
                        this.fixedQuestions.set(questionsValue as SelectableQuestion[]);
                        this.copied.emit(copy);
                    },
                    error: (err) => this.toast.error(err),
                });
            },
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

    getOtherOwners = (question: LibraryQuestion): User[] => {
        return question.questionOwners.filter((o) => o.id !== this.user.id);
    };

    getOwnersToDisplay = (question: LibraryQuestion): User[] => {
        return this.user.isAdmin ? question.questionOwners : this.getOtherOwners(question);
    };

    printTags = (question: LibraryQuestion) => {
        const ownTags = question.tags.filter((t) => t.creator?.id === this.user.id);
        return ownTags.map((t) => t.name).join(', ');
    };

    pageSelected = (event: { page: number }) => this.currentPage.set(event.page);

    setPredicate = (predicate: string) => {
        if (this.questionsPredicate() === predicate) {
            this.reverse.set(!this.reverse());
        }
        this.questionsPredicate.set(predicate);
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
            predicate: this.questionsPredicate(),
            reverse: this.reverse(),
        };
        this.Library.storeFilters(filters, 'sorting');
    };
}
