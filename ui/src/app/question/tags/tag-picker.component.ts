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
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';
import { SessionService } from 'src/app/session/session.service';
import type { Question, Tag } from '../../exam/exam.model';
import { QuestionDraft } from '../question.service';

@Component({
    selector: 'xm-tag-picker',
    template: `
        <form>
            <div class="row mt-3 align-items-center">
                <label class="col-md-3 col-form-label" for="newTag"
                    >{{ 'i18n_tag_question' | translate
                    }}<sup
                        class="ms-1"
                        ngbPopover="{{ 'i18n_question_tag_question_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                        ><img src="/assets/images/icon_tooltip.svg" alt="" /></sup
                ></label>

                <div class="col-md-3">
                    <div class="input-group">
                        <input
                            id="newTag"
                            name="newTag"
                            maxlength="30"
                            class="form-control col-md-8"
                            [(ngModel)]="tagName"
                            xmLowerCase
                            [ngbTypeahead]="getTags$"
                            (selectItem)="onTagSelect($event)"
                            [resultFormatter]="nameFormat"
                            [inputFormatter]="nameFormat"
                        />
                        <button
                            class="input-group-text btn btn-primary green"
                            (click)="addTag()"
                            [disabled]="!newTag || newTag.name.length < 2"
                        >
                            {{ 'i18n_add' | translate }}
                        </button>
                    </div>
                </div>
                <div class="col">
                    <ul class="list-inline mt-1">
                        @for (tag of ownTags; track tag) {
                            <li class="list-inline-item">
                                {{ tag.name }}
                                <button
                                    class="reviewer-remove"
                                    ngbPopover="{{ 'i18n_remove' | translate }}"
                                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                                    triggers="mouseenter:mouseleave"
                                    (click)="removeTag(tag)"
                                    title="{{ 'i18n_remove' | translate }}"
                                >
                                    <img src="/assets/images/icon_remove.svg" alt="" />
                                </button>
                            </li>
                        }
                    </ul>
                </div>
            </div>
        </form>
    `,
    standalone: true,
    imports: [FormsModule, NgbPopover, NgbTypeahead, TranslateModule],
})
export class TagPickerComponent implements OnInit {
    @Input() question!: Question | QuestionDraft;
    tagName = '';
    newTag: Tag = { name: '', questions: [] };
    ownTags: Tag[] = [];

    constructor(
        private http: HttpClient,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.ownTags = this.question.tags.filter((t) => t.creator?.id === this.Session.getUser().id);
    }

    getTags$ = (text$: Observable<string>): Observable<Tag[]> =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((term) => {
                if (term.length < 2) return from([]);
                else {
                    return this.http
                        .get<Tag[]>('/app/tags', { params: { filter: term } })
                        .pipe(map((tags) => ({ filter: term, tags: tags })));
                }
            }),
            map((resp) => {
                const { filter, tags } = resp;
                if (filter) {
                    tags.unshift({ name: filter, questions: [] });
                }
                // filter out the ones already tagged for this question and slice
                return tags
                    .filter((tag) => !this.question.tags || this.question.tags.every((qt) => qt.name !== tag.name))
                    .slice(0, 15);
            }),
        );

    onTagSelect = (event: NgbTypeaheadSelectItemEvent) => (this.newTag = event.item);
    nameFormat = (tag: Tag) => tag.name;

    addTag = () => {
        if (this.newTag) {
            this.question.tags.push(this.newTag);
            this.ownTags.push(this.newTag);
        }
        this.newTag = { name: '', questions: [] };
        this.tagName = '';
    };

    removeTag = (tag: Tag) => this.question.tags.splice(this.question.tags.indexOf(tag), 1);
}
