// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbDropdownModule, NgbModal, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { from, noop, tap } from 'rxjs';
import { Question, Tag } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { FileService } from 'src/app/shared/file/file.service';
import { LibraryTransferDialogComponent } from './export/library-transfer-dialog.component';
import { LibraryOwnersDialogComponent } from './owners/library-owners-dialog.component';
import { LibraryResultsComponent } from './results/library-results.component';
import { LibrarySearchComponent } from './search/library-search.component';
import { LibraryTagsDialogComponent } from './tags/library-tags-dialog.component';

@Component({
    selector: 'xm-library',
    template: `
        <xm-page-header text="i18n_library_new" [appendWide]="true" [appendTemplate]="buttons" />
        <xm-page-content [content]="content" />
        <ng-template #buttons>
            <div class="float-end pe-3">
                <button (click)="import()" class="btn btn-success me-3">
                    {{ 'i18n_toolbar_import_questions' | translate }}
                </button>
                <button [routerLink]="['new']" [queryParams]="{ nextState: 'questions' }" class="btn btn-success">
                    {{ 'i18n_toolbar_new_question' | translate }}
                </button>
            </div>
        </ng-template>
        <ng-template #content>
            <div class="xm-bordered-area">
                <div class="row ms-4 mt-2">
                    <div class="col-12">
                        <strong>{{ 'i18n_search' | translate }}:</strong>
                        <span
                            ngbPopover="{{ 'i18n_library_search_instructions' | translate }}"
                            popoverTitle="{{ 'i18n_instructions' | translate }}"
                            triggers="mouseenter:mouseleave"
                            class="ms-2"
                        >
                            <img src="/assets/images/icon_tooltip.svg" alt="" />
                        </span>
                    </div>
                </div>
                <xm-library-search (updated)="resultsUpdated($event)"></xm-library-search>
                <div class="row ms-4 mb-1">
                    <div class="col-12">
                        <strong>{{ 'i18n_actions' | translate }}:</strong>
                    </div>
                </div>
                <div class="row ms-4">
                    <div class="col-12">
                        <span ngbDropdown [autoClose]="'outside'">
                            <button
                                class="btn btn-outline-secondary btn-sm"
                                type="button"
                                id="dropDownMenu1"
                                ngbDropdownToggle
                            >
                                {{ 'i18n_choose' | translate }}&nbsp;
                                <span class="caret"></span>
                            </button>
                            <ul class="pointer" role="menu" aria-labelledby="dropDownMenu1" ngbDropdownMenu>
                                <li
                                    ngbDropdownItem
                                    role="presentation"
                                    ngbDropdownItem
                                    [disabled]="selections.length === 0"
                                    (click)="openOwnerSelection()"
                                >
                                    <a role="menuitem">{{ 'i18n_add_question_owner' | translate }}</a>
                                </li>
                                <li
                                    ngbDropdownItem
                                    role="presentation"
                                    ngbDropdownItem
                                    [disabled]="selections.length === 0"
                                    (click)="openTagSelection()"
                                >
                                    <a role="menuitem">{{ 'i18n_tag_questions' | translate }}</a>
                                </li>
                                <li
                                    ngbDropdownItem
                                    role="presentation"
                                    ngbDropdownItem
                                    [disabled]="selections.length === 0"
                                    (click)="openFileTransfer()"
                                >
                                    <a role="menuitem">{{ 'i18n_transfer_questions' | translate }}</a>
                                </li>
                                <li
                                    ngbDropdownItem
                                    role="presentation"
                                    ngbDropdownItem
                                    [disabled]="selections.length === 0"
                                    (click)="export()"
                                >
                                    <a role="menuitem">{{ 'i18n_export_questions' | translate }}</a>
                                </li>
                            </ul>
                        </span>
                        @if (selections.length === 0) {
                            <small class="ms-2 text-muted">{{ 'i18n_choose_atleast_one' | translate }}</small>
                        }
                        @if (selections.length > 0) {
                            <small class="ms-2">
                                {{ selections.length }} {{ 'i18n_questions_selected' | translate }}
                            </small>
                        }
                    </div>
                </div>

                <div class="mt-3">
                    <xm-library-results
                        [questions]="questions"
                        (copied)="questionCopied($event)"
                        (selected)="questionSelected($event)"
                    >
                    </xm-library-results>
                </div>
            </div>
        </ng-template>
    `,
    standalone: true,
    imports: [
        RouterLink,
        NgbDropdownModule,
        NgbPopoverModule,
        LibrarySearchComponent,
        LibraryOwnersDialogComponent,
        LibraryTransferDialogComponent,
        LibraryResultsComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
    styleUrl: './library.component.scss',
})
export class LibraryComponent {
    questions: Question[] = [];
    selections: number[] = [];

    constructor(
        private router: Router,
        private translate: TranslateService,
        private modal: NgbModal,
        private toast: ToastrService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    resultsUpdated(results: Question[]) {
        this.questions = results;
    }

    questionSelected(selections: number[]) {
        this.selections = selections;
    }

    questionCopied(copy: Question) {
        this.toast.info(this.translate.instant('i18n_question_copied'));
        this.router.navigate(['/staff/questions', copy.id, 'edit']);
    }

    import() {
        this.Attachment.selectFile(false, {}, 'i18n_import_questions_detail')
            .then((result) => {
                this.Files.upload('/app/questions/import', result.$value.attachmentFile, {}, undefined, () =>
                    this.reload(),
                );
                this.toast.success(`${this.translate.instant('i18n_questions_imported_successfully')}`);
            })
            .catch(noop);
    }

    export() {
        if (this.selections.length === 0) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
        } else {
            this.Files.download(
                '/app/questions/export',
                'moodle-export.xml',
                { ids: this.selections.map((s) => s.toString()) },
                true,
            );
        }
    }

    openOwnerSelection() {
        const modalRef = this.modal.open(LibraryOwnersDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.selections = this.selections;
        from(modalRef.result)
            .pipe(
                tap((result: { questions: number[]; users: User[] }) => {
                    const questions = this.questions.filter((q) => result.questions.includes(q.id));
                    questions.forEach((q) => q.questionOwners.push(...result.users));
                }),
            )
            .subscribe();
    }

    openTagSelection() {
        const modalRef = this.modal.open(LibraryTagsDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.selections = this.selections;
        from(modalRef.result)
            .pipe(
                tap((result: { questions: number[]; tags: Tag[] }) => {
                    const questions = this.questions.filter((q) => result.questions.includes(q.id));
                    questions.forEach((q) => result.tags.forEach((t) => this.addTagIfNotExists(q, t)));
                }),
            )
            .subscribe();
    }

    openFileTransfer() {
        const modalRef = this.modal.open(LibraryTransferDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.selections = this.selections;
    }

    private addTagIfNotExists(q: Question, t: Tag) {
        if (!q.tags.map((qt) => qt.id).includes(t.id)) {
            q.tags.push(t);
        }
    }

    private reload = () =>
        this.router
            .navigateByUrl('/', { skipLocationChange: true })
            .then(() => this.router.navigate(['/staff/questions']));
}
