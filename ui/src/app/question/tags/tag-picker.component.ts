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
import { Component, Input } from '@angular/core';
import type { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';
import type { Question, Tag } from '../../exam/exam.model';
import { QuestionDraft } from '../question.service';

@Component({
    selector: 'xm-tag-picker',
    template: `
        <div class="row mt-2">
            <div class="col-md-3 exam-basic-title">
                {{ 'sitnet_tag_question' | translate }}
                <sup
                    ngbPopover="{{ 'sitnet_question_tag_question_description' | translate }}"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                    ><img src="/assets/images/icon_tooltip.svg" alt="exam"
                /></sup>
            </div>
            <div class="flex">
                <input
                    id="newTag"
                    name="newTag"
                    maxlength="30"
                    class="form-control wdth-30 make-inline"
                    [(ngModel)]="tagName"
                    lowerCase
                    [ngbTypeahead]="getTags$"
                    (selectItem)="onTagSelect($event)"
                    [resultFormatter]="nameFormat"
                    [inputFormatter]="nameFormat"
                />
                <button
                    (click)="addTag()"
                    [disabled]="!newTag || newTag.name.length < 2"
                    class="btn btn-primary green border-green marl5"
                >
                    {{ 'sitnet_add' | translate }}
                </button>
            </div>
            <ul class="list-inline mart10">
                <li *ngFor="let tag of question.tags">
                    {{ tag.name }}
                    <button
                        class="reviewer-remove"
                        ngbPopover="{{ 'sitnet_remove' | translate }}"
                        popoverTitle="{{ 'sitnet_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                        (click)="removeTag(tag)"
                        title="{{ 'sitnet_remove' | translate }}"
                    >
                        <img src="/assets/images/icon_remove.svg" alt="exam" />
                    </button>
                </li>
            </ul>
        </div>
    `,
})
export class TagPickerComponent {
    @Input() question!: Question | QuestionDraft;
    tagName = '';
    newTag: Tag = { name: '' };

    constructor(private http: HttpClient) {}

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
                    tags.unshift({ name: filter });
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
        if (this.newTag) this.question.tags.push(this.newTag);
        this.newTag = { name: '' };
        this.tagName = '';
    };

    removeTag = (tag: Tag) => this.question.tags.splice(this.question.tags.indexOf(tag), 1);
}
