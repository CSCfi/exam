/*
 * Copyright (c) 2020 Exam Consortium
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
import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbDropdownModule, NgbModal, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { from, tap } from 'rxjs';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import type { Question, Tag } from '../../exam/exam.model';
import type { User } from '../../session/session.service';
import { LibraryFileExportComponent } from './export/library-file-export.component';
import { LibraryTransferDialogComponent } from './export/library-transfer-dialog.component';
import { LibraryOwnersDialogComponent } from './owners/library-owners-dialog.component';
import { LibraryResultsComponent } from './results/library-results.component';
import { LibrarySearchComponent } from './search/library-search.component';
import { LibraryTagsDialogComponent } from './tags/library-tags-dialog.component';

@Component({
    selector: 'xm-library',
    template: `<div id="dashboard">
        <div class="top-row">
            <div class="col-md-12">
                <div class="student-enroll-title-wrap">
                    <div class="student-enroll-title marl20 marr-20">{{ 'i18n_library_new' | translate }}</div>
                </div>
                <div class="teacher-toolbar">
                    <div class="make-inline">
                        <div class="review-attachment-button print-button">
                            <a (click)="import()" class="pointer">
                                {{ 'i18n_toolbar_import_questions' | translate }}
                            </a>
                        </div>
                    </div>
                </div>
                <div class="teacher-toolbar">
                    <div class="make-inline">
                        <div class="review-attachment-button print-button">
                            <a [routerLink]="['new']" [queryParams]="{ nextState: 'questions' }" class="pointer">
                                {{ 'i18n_toolbar_new_question' | translate }}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="reservation-border">
            <div class="row ms-4 mt-2">
                <div class="col-12">
                    <strong>{{ 'i18n_search' | translate }}:</strong>
                    <span
                        ngbPopover="{{ 'i18n_library_search_instructions' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                        class="ms-2"
                    >
                        <img
                            src="/assets/images/icon_tooltip.svg"
                            alt=""
                            onerror="this.onerror=null;this.src='/assets/images/icon_tooltip.png';"
                        />
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
                    <small class="ms-2 text-muted" *ngIf="selections.length === 0">{{
                        'i18n_choose_atleast_one' | translate
                    }}</small>
                    <small class="ms-2" *ngIf="selections.length > 0">
                        {{ selections.length }} {{ 'i18n_questions_selected' | translate }}
                    </small>
                </div>
            </div>

            <div class="margin-20">
                <xm-library-results
                    [questions]="questions"
                    (copied)="questionCopied($event)"
                    (selected)="questionSelected($event)"
                >
                </xm-library-results>
            </div>
        </div>
    </div> `,
    standalone: true,
    imports: [
        NgIf,
        RouterLink,
        NgbDropdownModule,
        NgbPopoverModule,
        LibrarySearchComponent,
        LibraryOwnersDialogComponent,
        LibraryTransferDialogComponent,
        LibraryFileExportComponent,
        LibraryResultsComponent,
        TranslateModule,
    ],
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
            .catch((err) => this.toast.error(err));
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
