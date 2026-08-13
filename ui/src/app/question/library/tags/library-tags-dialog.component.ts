// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgbActiveModal, NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';
import { LibraryService } from 'src/app/question/library/library.service';
import { Tag } from 'src/app/question/question.model';

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
    imports: [NgbTypeaheadModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryTagsDialogComponent {
    readonly selections = signal<number[]>([]);
    readonly tags = signal<Tag[]>([]);
    readonly newTags = signal<number[]>([]);
    readonly selectedTagId = signal<number | undefined>(undefined);

    protected readonly activeModal = inject(NgbActiveModal);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Library = inject(LibraryService);

    constructor() {
        this.Library.listAllTags$().subscribe((tags: Tag[]) => {
            this.tags.set(tags);
        });
    }

    listTags$ = (criteria$: Observable<string>): Observable<Tag[]> =>
        criteria$.pipe(
            debounceTime(100),
            distinctUntilChanged(),
            map((text) => (text.length < 1 ? [] : this.filterByName(this.tags(), text))),
            take(8),
            catchError((err) => {
                this.toast.error(err.data);
                return throwError(() => new Error(err));
            }),
        );

    nameFormatter = (data: { name: string; email: string }) => `${data.name}${data.email ? ' ' + data.email : ''}`;

    setQuestionTag = (event: NgbTypeaheadSelectItemEvent) => this.selectedTagId.set(event.item.id);

    addTagForSelected = () => {
        const tagId = this.selectedTagId();
        if (!tagId) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
            return;
        }

        this.Library.addTagForQuestions$(tagId, this.selections()).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('i18n_question_associated_with_tag'));
                this.newTags.update((ids) => [...ids, tagId]);
            },
            error: () => this.toast.error(this.translate.instant('i18n_update_failed')),
        });
    };

    close = () =>
        this.activeModal.close({
            questions: this.selections(),
            tags: this.tags().filter((t) => this.newTags().includes(t.id as number)),
        });

    private filterByName = (src: Tag[], q: string): Tag[] => {
        if (!q) return src;
        return src.filter((u) => u.name?.toLowerCase().includes(q.toLowerCase()));
    };
}
