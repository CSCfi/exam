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
import { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { from, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';

import { Question, Tag } from '../../exam/exam.model';

@Component({
    selector: 'tag-picker',
    template: `
        <div class="col-md-12 margin-20 padl0 padr0">
            <div class="col-md-3 exam-basic-title padl0">
                {{ 'sitnet_tag_question' | translate }}
                <sup
                    ><img
                        ngbPopover="{{ 'sitnet_question_tag_question_description' | translate }}"
                        placement="right"
                        trigger="mouseenter"
                        src="{{ tooltipIcon }}"
                        alt="exam"
                /></sup>
            </div>
            <div class="col-md-9 padr0">
                <input
                    id="newTag"
                    name="newTag"
                    maxlength="30"
                    #newTag
                    (newTag)="newTag.value = $event.target.value.toLowerCase()"
                    class="form-control wdth-30 make-inline"
                    [(ngModel)]="tagName"
                    ngbTypeahead="getTags$"
                    (selectItem)="onTagSelect($event)"
                    [resultFormatter]="nameFormat"
                />
                <span>
                    <button
                        (click)="addTag()"
                        [disabled]="!question.newTag || question.newTag.length < 2"
                        class="btn btn-primary green border-green"
                    >
                        {{ 'sitnet_add' | translate }}
                    </button>
                </span>
                <ul class="list-inline mart10">
                    <li *ngFor="let tag of question.tags">
                        {{ tag.name }}
                        <button
                            class="reviewer-remove"
                            ngbPopover="{{ 'sitnet_remove' | translate }}"
                            placement="top"
                            delay="500"
                            trigger="mouseenter"
                            (click)="removeTag(tag)"
                            title="{{ 'sitnet_remove' | translate }}"
                        >
                            <img src="{{ removalIcon }}" alt="exam" />
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    `,
})
export class TagPickerComponent {
    @Input() question: Question & { newTag?: Tag };
    tooltipIcon: unknown;
    removalIcon: unknown;
    tagName: string;

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.tooltipIcon = require('Images/icon_tooltip.svg');
        this.removalIcon = require('Images/icon_remove.svg');
    }

    getTags$ = (text$: Observable<string>): Observable<Tag[]> =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap(term => {
                if (term.length < 2) return from([]);
                else {
                    return this.http
                        .get<Tag[]>('/app/tags', { params: { filter: term } })
                        .pipe(map(tags => ({ filter: term, tags: tags })));
                }
            }),
            map(resp => {
                const { filter, tags } = resp;
                if (filter) {
                    tags.unshift({ name: filter });
                }
                // filter out the ones already tagged for this question and slice
                return tags.filter(tag => this.question.tags.every(qt => qt.name !== tag.name)).slice(0, 15);
            }),
        );

    onTagSelect = (event: NgbTypeaheadSelectItemEvent) => (this.question.newTag = event.item);
    nameFormat = (tag: Tag) => tag.name;

    addTag = () => {
        if (this.question.newTag) this.question.tags.push(this.question.newTag);
        delete this.question.newTag;
        this.tagName = '';
    };

    removeTag = (tag: Tag) => this.question.tags.splice(this.question.tags.indexOf(tag), 1);
}
