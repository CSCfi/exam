// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, effect, inject, input, model } from '@angular/core';
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

@Component({
    selector: 'xm-eq-essay',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, NgbPopoverModule, TranslateModule],
    styleUrls: ['../question.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div [formGroup]="essayForm" id="essay">
            <div class="row">
                <div class="col-md-12 mt-2 pr-0">
                    <div class="xm-paragraph-title">{{ 'i18n_comments' | translate }}</div>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-md-3">
                    {{ 'i18n_essay_length_recommendation' | translate }}
                </div>
                <span class="col-md-4">
                    <div class="input-group" id="expectedWordCount">
                        <input
                            name="expectedWordCount"
                            type="number"
                            lang="en"
                            class="form-control"
                            formControlName="expectedWordCount"
                            [min]="1"
                            [max]="1000000"
                        />
                        <span class="input-group-text" title="{{ 'i18n_average_word_length_finnish' | translate }}">
                            {{ 'i18n_approximately' | translate }} {{ estimateCharacters() }}
                            {{ 'i18n_characters' | translate }}
                        </span>
                    </div>
                    @if (essayForm.get('expectedWordCount')?.invalid && essayForm.get('expectedWordCount')?.touched) {
                        <div class="warning-text-small m-1 edit-warning-container">
                            <i class="bi-exclamation-circle text-danger me-2"></i>
                            {{ 'i18n_essay_length_recommendation_bounds' | translate }}
                        </div>
                    }
                </span>
            </div>
            <div class="row mt-2">
                <div class="col-md-3">
                    {{ 'i18n_evaluation_type' | translate }}
                </div>
                <div class="col-md-2">
                    <select
                        id="evaluationType"
                        class="form-select w-75"
                        name="evaluationType"
                        formControlName="evaluationType"
                        required
                    >
                        <option value="Points">{{ 'i18n_word_points' | translate }}</option>
                        <option value="Selection">{{ 'i18n_evaluation_select' | translate }}</option>
                    </select>
                </div>
            </div>
            <!-- Evaluation criteria -->
            <div class="row mt-3">
                <div class="col-md-3">
                    {{ 'i18n_exam_evaluation_criteria' | translate }}
                    <sup
                        ngbPopover="{{ 'i18n_question_evaluation_criteria_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                        triggers="mouseenter:mouseleave"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" />
                    </sup>
                </div>
                <div class="col-md-9 pe-0">
                    <textarea
                        id="defaultEvaluationCriteria"
                        name="defaultEvaluationCriteria"
                        class="form-control"
                        rows="3"
                        formControlName="evaluationCriteria"
                        placeholder="{{ 'i18n_exam_evaluation_criteria' | translate }}"
                    >
                    </textarea>
                </div>
            </div>
        </div>
    `,
})
export class EssayComponent {
    evaluationType = model<string>();
    expectedWordCount = model<number>();
    evaluationCriteria = model<string>();
    lotteryOn = input<boolean>(false);

    essayForm: FormGroup;
    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create nested form group for essay fields
        this.essayForm = new FormGroup({
            expectedWordCount: new FormControl(null, [Validators.min(1), Validators.max(1000000)]),
            evaluationType: new FormControl('', [Validators.required]),
            evaluationCriteria: new FormControl(''),
        });

        // Add to parent form
        this.parentForm.form.addControl('essay', this.essayForm);

        // Sync form with model signals
        effect(() => {
            this.essayForm.patchValue(
                {
                    expectedWordCount: this.expectedWordCount() ?? null,
                    evaluationType: this.evaluationType() || '',
                    evaluationCriteria: this.evaluationCriteria() || '',
                },
                { emitEvent: false },
            );
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const evaluationTypeControl = this.essayForm.get('evaluationType');
            if (evaluationTypeControl) {
                if (this.lotteryOn()) {
                    evaluationTypeControl.disable({ emitEvent: false });
                } else {
                    evaluationTypeControl.enable({ emitEvent: false });
                }
            }
        });

        // Sync form changes back to model signals
        this.essayForm.get('expectedWordCount')?.valueChanges.subscribe((value) => {
            if (this.expectedWordCount() !== value) {
                this.expectedWordCount.set(value ?? undefined);
            }
        });

        this.essayForm.get('evaluationType')?.valueChanges.subscribe((value) => {
            const typeValue = value || undefined;
            if (this.evaluationType() !== typeValue) {
                this.evaluationType.set(typeValue);
            }
        });

        this.essayForm.get('evaluationCriteria')?.valueChanges.subscribe((value) => {
            const criteriaValue = value || undefined;
            if (this.evaluationCriteria() !== criteriaValue) {
                this.evaluationCriteria.set(criteriaValue);
            }
        });
    }

    estimateCharacters() {
        return (this.expectedWordCount() || 0) * 8;
    }
}
