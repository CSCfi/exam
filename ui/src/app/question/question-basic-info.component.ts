// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { AfterViewInit, Component, effect, inject, input, output } from '@angular/core';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';

@Component({
    imports: [TranslateModule, ReactiveFormsModule, NgbPopoverModule, UpperCasePipe, CKEditorComponent],
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
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
        <div class="row mt-3" [formGroup]="basicInfoForm">
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
                    formControlName="questionType"
                    required
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
export class QuestionBasicInfoComponent implements AfterViewInit {
    question = input<{ question: string; type: string }>(); // make required somehow
    questionTypes = input<{ type: string; name: string }[]>([]);
    questionId = input<number>();
    newText = output<string>();
    newType = output<string>();

    basicInfoForm: FormGroup;
    private parentForm = inject(FormGroupDirective, { optional: true });

    constructor() {
        // Create nested form group for basic info fields
        // questionType is only required for new questions (when type is not set)
        this.basicInfoForm = new FormGroup({
            questionType: new FormControl(''),
        });

        // Sync form with question type
        effect(() => {
            const q = this.question();
            const questionTypeControl = this.basicInfoForm.get('questionType');
            if (!questionTypeControl) return;

            if (q?.type) {
                // For existing questions with a type, set a value and clear validators
                // This ensures the form is valid even though the select is hidden
                questionTypeControl.setValue(q.type, { emitEvent: false });
                questionTypeControl.clearValidators();
                questionTypeControl.updateValueAndValidity({ emitEvent: false });
            } else {
                // For new questions, add required validator
                questionTypeControl.setValidators([Validators.required]);
                questionTypeControl.updateValueAndValidity({ emitEvent: false });
            }
        });

        // Sync form changes back to output
        this.basicInfoForm.get('questionType')?.valueChanges.subscribe((value) => {
            if (value) {
                this.newType.emit(value);
            }
        });
    }

    ngAfterViewInit() {
        // Add to parent form if available
        // Do this in ngAfterViewInit to ensure FormGroupDirective is fully initialized
        if (this.parentForm?.form && !this.parentForm.form.get('basicInfo')) {
            this.parentForm.form.addControl('basicInfo', this.basicInfoForm);
        }
    }

    textChanged = (event: string) => this.newText.emit(event);
}
