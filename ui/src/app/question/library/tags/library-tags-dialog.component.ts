// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';
import { Tag } from 'src/app/exam/exam.model';
import { LibraryService } from 'src/app/question/library/library.service';

@Component({
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_tag_questions' | translate }}</h1>
        </div>
        <div class="modal-body">
            <div class="row">
                <div class="col-6">
                    <div class="form-group input-group">
                        <input
                            class="form-control"
                            [ngbTypeahead]="listTags$"
                            (selectItem)="setQuestionTag($event)"
                            [inputFormatter]="nameFormatter"
                            [resultFormatter]="nameFormatter"
                        />
                        <div class="input-group-append">
                            <button class="btn btn-success" (click)="addTagForSelected()">
                                {{ 'i18n_add' | translate }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" (click)="close()" autofocus>
                {{ 'i18n_close' | translate }}
            </button>
        </div>
    `,
    standalone: true,
    imports: [NgbTypeaheadModule, TranslateModule],
})
export class LibraryTagsDialogComponent implements OnInit {
    @Input() selections: number[] = [];

    tags: Tag[] = [];
    newTags: number[] = [];
    selectedTagId?: number;

    constructor(
        public activeModal: NgbActiveModal,
        private translate: TranslateService,
        private toast: ToastrService,
        private Library: LibraryService,
    ) {}

    ngOnInit() {
        this.Library.listAllTags$().subscribe((tags: Tag[]) => {
            this.tags = tags;
        });
    }

    listTags$ = (criteria$: Observable<string>): Observable<Tag[]> =>
        criteria$.pipe(
            debounceTime(100),
            distinctUntilChanged(),
            map((text) => (text.length < 1 ? [] : this.filterByName(this.tags, text))),
            take(8),
            catchError((err) => {
                this.toast.error(err.data);
                return throwError(() => new Error(err));
            }),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name}${data.email ? ' ' + data.email : ''}`;

    setQuestionTag = (event: NgbTypeaheadSelectItemEvent) => (this.selectedTagId = event.item.id);

    addTagForSelected = () => {
        // check that atleast one has been selected
        if (!this.selectedTagId) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
            return;
        }

        this.Library.addTagForQuestions$(this.selectedTagId, this.selections).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_question_associated_with_tag'));
                this.newTags.push(this.selectedTagId as number);
            },
            error: () => this.toast.error(this.translate.instant('i18n_update_failed')),
        });
    };

    close = () =>
        this.activeModal.close({
            questions: this.selections,
            tags: this.tags.filter((t) => this.newTags.includes(t.id as number)),
        });

    private filterByName = (src: Tag[], q: string): Tag[] => {
        if (!q) return src;
        return src.filter((u) => u.name?.toLowerCase().includes(q.toLowerCase()));
    };
}
