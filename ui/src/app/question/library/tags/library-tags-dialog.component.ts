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
import type { OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators';
import { Tag } from 'src/app/exam/exam.model';
import { LibraryService } from '../library.service';

@Component({
    template: `
        <div id="sitnet-dialog" role="dialog" aria-modal="true">
            <div class="modal-header">
                <div class="student-enroll-dialog-wrap">
                    <h1 class="student-enroll-title">{{ 'sitnet_add_question_tag' | translate }}</h1>
                </div>
            </div>
            <div class="modal-body">
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
                            {{ 'sitnet_add' | translate }}
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div class="student-message-dialog-button-save">
                    <button class="btn btn-sm btn-primary" (click)="close()" autofocus>
                        {{ 'sitnet_close' | translate }}
                    </button>
                </div>
            </div>
        </div>
    `,
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
            this.toast.warning(this.translate.instant('sitnet_add_question_tag'));
            return;
        }

        this.Library.addTagForQuestions$(this.selectedTagId, this.selections).subscribe({
            next: () => {
                this.toast.info(this.translate.instant('sitnet_tag_added'));
                this.newTags.push(this.selectedTagId as number);
            },
            error: () => this.toast.error(this.translate.instant('sitnet_update_failed')),
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
