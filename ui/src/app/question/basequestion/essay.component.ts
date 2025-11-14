// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Question, QuestionDraft } from 'src/app/question/question.model';

@Component({
    selector: 'xm-essay-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    template: `
        <div [formGroup]="essayForm">
            <div class="row mt-3">
                <div class="col-md-3 ">
                    {{ 'i18n_essay_length_recommendation' | translate }}
                </div>
                <div class="col-md-6">
                    <div class="input-group">
                        <input
                            id="wc"
                            name="wc"
                            type="number"
                            lang="en"
                            class="form-control xm-numeric-input"
                            formControlName="defaultExpectedWordCount"
                            [min]="1"
                            [max]="1000000"
                        />
                        <span class="input-group-text" title="{{ 'i18n_average_word_length_finnish' | translate }}">
                            {{ 'i18n_approximately' | translate }} {{ estimateCharacters() }}
                            {{ 'i18n_characters' | translate }}
                        </span>
                    </div>
                    @if (
                        essayForm.get('defaultExpectedWordCount')?.invalid &&
                        essayForm.get('defaultExpectedWordCount')?.touched
                    ) {
                        <div class="warning-text-small m-2 edit-warning-container">
                            <i class="bi-exclamation-circle text-danger me-2"></i>
                            {{ 'i18n_essay_length_recommendation_bounds' | translate }}
                        </div>
                    }
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-md-3">
                    {{ 'i18n_evaluation_type' | translate }}
                </div>
                <div class="col-md-3">
                    <select
                        id="evaluationType"
                        name="evaluationType"
                        class="form-select w-75"
                        formControlName="defaultEvaluationType"
                        [required]="question().type === 'EssayQuestion'"
                    >
                        <option value="Points">{{ 'i18n_word_points' | translate }}</option>
                        <option value="Selection">{{ 'i18n_evaluation_select' | translate }}</option>
                    </select>
                </div>
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    imports: [ReactiveFormsModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EssayEditorComponent {
    question = input.required<Question | QuestionDraft>();
    lotteryOn = input(false);

    essayForm: FormGroup;
    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create nested form group for essay fields
        this.essayForm = new FormGroup({
            defaultExpectedWordCount: new FormControl(null, [Validators.min(1), Validators.max(1000000)]),
            defaultEvaluationType: new FormControl('Points'),
        });

        // Add to parent form
        this.parentForm.form.addControl('essay', this.essayForm);

        // Sync form with question values
        effect(() => {
            const q = this.question();
            if (q) {
                this.essayForm.patchValue(
                    {
                        defaultExpectedWordCount: q.defaultExpectedWordCount || null,
                        defaultEvaluationType: q.defaultEvaluationType || 'Points',
                    },
                    { emitEvent: false },
                );
            }
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const evaluationTypeControl = this.essayForm.get('defaultEvaluationType');
            if (evaluationTypeControl) {
                if (this.lotteryOn()) {
                    evaluationTypeControl.disable({ emitEvent: false });
                } else {
                    evaluationTypeControl.enable({ emitEvent: false });
                }
            }
        });

        // Sync form changes back to question object
        this.essayForm.get('defaultExpectedWordCount')?.valueChanges.subscribe((value) => {
            const questionValue = this.question();
            if (questionValue !== undefined && questionValue.defaultExpectedWordCount !== value) {
                questionValue.defaultExpectedWordCount = value ?? undefined;
            }
        });

        this.essayForm.get('defaultEvaluationType')?.valueChanges.subscribe((value) => {
            const questionValue = this.question();
            if (questionValue !== undefined && questionValue.defaultEvaluationType !== value) {
                questionValue.defaultEvaluationType = value;
                if (value === 'Selection') {
                    delete questionValue.defaultMaxScore;
                }
            }
        });
    }

    estimateCharacters() {
        const wordCount = this.essayForm.get('defaultExpectedWordCount')?.value;
        return (wordCount || 0) * 8;
    }
}
