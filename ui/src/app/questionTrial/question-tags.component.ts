// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgbPopover, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map } from 'rxjs/operators';
import type { QuestionDraft, ReverseQuestion, Tag } from 'src/app/question/question.model';
import { SessionService } from 'src/app/session/session.service';

@Component({
    selector: 'xm-question-tags-trial',
    standalone: true,
    templateUrl: './question-tags.component.html',
    imports: [TranslateModule, NgbPopover, NgbTypeahead],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionTagsTrialComponent {
    question = input.required<ReverseQuestion | QuestionDraft>();
    collaborative = input(false);

    tagsChange = output<Tag[]>();

    ownTags = computed(() => {
        const questionValue = this.question();
        if (!questionValue.tags) {
            return [];
        }
        return questionValue.tags.filter((t) => t.creator?.id === this.user.id);
    });

    private http = inject(HttpClient);
    private Session = inject(SessionService);
    private user = this.Session.getUser();
    private newTagTemplate = signal<Tag | undefined>(undefined);
    private tagName = signal<string>('');

    get newTag(): Tag | undefined {
        return this.newTagTemplate();
    }

    get currentTagName(): string {
        return this.tagName();
    }

    getTags$ = (text$: Observable<string>): Observable<Tag[]> =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            exhaustMap((term) => {
                if (term.length < 2) return from([]);
                return this.http
                    .get<Tag[]>('/app/tags', { params: { filter: term } })
                    .pipe(map((tags) => ({ filter: term, tags: tags })));
            }),
            map((resp) => {
                const { filter, tags } = resp;
                const questionValue = this.question();
                if (filter) {
                    tags.unshift({ name: filter, questions: [] });
                }
                // filter out the ones already tagged for this question and slice
                return tags
                    .filter(
                        (tag) =>
                            !questionValue.tags ||
                            questionValue.tags.every((qt) => qt.name !== tag.name || qt.creator?.id !== this.user.id),
                    )
                    .slice(0, 15);
            }),
        );

    nameFormat = (tag: Tag): string => tag.name;

    onTagSelect(event: NgbTypeaheadSelectItemEvent) {
        const tag = event.item;
        this.newTagTemplate.set(tag);
        this.tagName.set(tag.name.toLowerCase());
    }

    onTagNameInput(event: Event) {
        const value = (event.target as HTMLInputElement).value.toLowerCase();
        this.tagName.set(value);
        // Clear template if user is typing
        if (this.newTagTemplate()) {
            this.newTagTemplate.set(undefined);
        }
    }

    addTag() {
        const template = this.newTagTemplate();
        if (template && template.name.length >= 2) {
            // Read current tags from question - this should be up-to-date after onTagsChange updates it
            const questionValue = this.question();
            const currentTags = questionValue.tags || [];

            // Check if tag already exists (by name and creator)
            const tagExists = currentTags.some((t) => t.name === template.name && t.creator?.id === this.user.id);

            if (!tagExists) {
                // Ensure new tag has creator set
                const tagToAdd: Tag = {
                    ...template,
                    creator: template.creator || this.user,
                    questions: template.questions || [],
                };
                const updatedTags = [...currentTags, tagToAdd];
                this.tagsChange.emit(updatedTags);
            }

            // Clear template and tag name
            this.newTagTemplate.set(undefined);
            this.tagName.set('');
        }
    }

    removeTag(tag: Tag) {
        // Read current tags from question - this should be up-to-date after onTagsChange updates it
        const questionValue = this.question();
        const currentTags = questionValue.tags || [];
        const updatedTags = currentTags.filter((t) => t !== tag);
        this.tagsChange.emit(updatedTags);
    }
}
