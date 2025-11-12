// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';

@Component({
    imports: [TranslateModule, FormsModule, NgbPopoverModule, UpperCasePipe, CKEditorComponent],
    selector: 'xm-question-basic-info',
    styles: '.initial-width { width: initial !important; }',
    template: ` @if (questionId()) {
            <div class="row mt-3">
                <div class="col-md-3">
                    {{ 'i18n_question_id' | translate }}
                </div>
                <div class="col-md-9 pe-0">#{{ questionId() }}</div>
            </div>
        }
        <div class="row mt-3">
            <div class="col-md-3">
                {{ 'i18n_new_question_type' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_question_type_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" />
                </sup>
            </div>
            <div class="col-md-9">
                <select
                    [hidden]="question()?.type"
                    id="newQuestion"
                    name="newQuestion"
                    class="form-select initial-width"
                    [(ngModel)]="type"
                    (change)="typeChanged()"
                    required="true"
                >
                    @for (type of questionTypes(); track type.name) {
                        <option value="{{ type.type }}">{{ type.name | translate }}</option>
                    }
                </select>
                @switch (question()?.type) {
                    @case ('EssayQuestion') {
                        {{ 'i18n_toolbar_essay_question' | translate }}
                    }
                    @case ('ClozeTestQuestion') {
                        {{ 'i18n_toolbar_cloze_test_question' | translate }}
                    }
                    @case ('MultipleChoiceQuestion') {
                        {{ 'i18n_toolbar_multiplechoice_question' | translate }}
                    }
                    @case ('WeightedMultipleChoiceQuestion') {
                        {{ 'i18n_toolbar_weighted_multiplechoice_question' | translate }}
                    }
                    @case ('ClaimChoiceQuestion') {
                        {{ 'i18n_toolbar_claim_choice_question' | translate }}
                    }
                }
            </div>
        </div>
        @if (question()?.type) {
            <div class="row mt-3">
                <div class="col-md-3">
                    {{ 'i18n_question_text' | translate }}
                    <sup
                        ngbPopover="{{ 'i18n_question_text_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" />
                    </sup>
                </div>
                <div class="col-md-9">
                    <xm-ckeditor
                        id="editor"
                        name="editor"
                        [enableClozeTest]="question()?.type === 'ClozeTestQuestion'"
                        [data]="question()?.question || ''"
                        (dataChange)="textChanged($event)"
                        [required]="true"
                    >
                    </xm-ckeditor>
                </div>
            </div>
            @if (!question()?.question) {
                <div class="row">
                    <div class="offset-md-3 col-md-9 text-danger">
                        <small> {{ 'i18n_write_question_above' | translate | uppercase }}</small>
                    </div>
                </div>
            }
        }`,
})
export class QuestionBasicInfoComponent {
    question = input<{ question: string; type: string }>(); // make required somehow
    questionTypes = input<{ type: string; name: string }[]>([]);
    questionId = input<number>();
    newText = output<string>();
    newType = output<string>();

    type = '';

    textChanged = (event: string) => this.newText.emit(event);
    typeChanged = () => this.newType.emit(this.type);
}
