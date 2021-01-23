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
    templateUrl: './tagPicker.component.html',
})
export class TagPickerComponent {
    @Input() question: Question & { newTag?: Tag };
    tagName: string;

    constructor(private http: HttpClient) {}

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
                return tags
                    .filter(tag => !this.question.tags || this.question.tags.every(qt => qt.name !== tag.name))
                    .slice(0, 15);
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
