// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-wmc-option-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    template: `
        <div [formGroup]="wmcOptionForm" class="m-0 p-0">
            <div class="row my-2">
                <div class="col-md-6 me-3 question-option-empty" [ngClass]="getOptionStyle()">
                    <textarea
                        id="optionText-{{ index() }}"
                        name="optionText-{{ index() }}"
                        type="text"
                        rows="1"
                        class="question-option-input form-control"
                        formControlName="optionText"
                        required
                    ></textarea>
                </div>
                <div class="col-md-2 question-option-empty-radio" [ngClass]="getOptionStyle()">
                    <input
                        id="optionScore-{{ index() }}"
                        name="optionScore-{{ index() }}"
                        class="question-option-input points"
                        type="number"
                        step="any"
                        lang="en"
                        formControlName="defaultScore"
                        xmFixedPrecision
                        required
                    />
                </div>
                <button
                    class="col-md-1 question-option-trash pointer btn btn-link "
                    [disabled]="!allowRemoval()"
                    (click)="removeOption()"
                    [title]="getRemoveTooltip()"
                >
                    <i class="bi-trash"></i>
                </button>
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    imports: [ReactiveFormsModule, NgClass, FixedPrecisionValidatorDirective, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightedMultipleChoiceOptionEditorComponent {
    option = input.required<MultipleChoiceOption>();
    index = input(0);
    question = input.required<Question | QuestionDraft>();
    lotteryOn = input(false);
    allowRemoval = input(false);
    isInPublishedExam = input(false);

    questionChange = output<Question | QuestionDraft>();

    wmcOptionForm: FormGroup;
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create nested form group for this option
        this.wmcOptionForm = new FormGroup({
            optionText: new FormControl('', [Validators.required]),
            defaultScore: new FormControl(0, [Validators.required]),
        });

        // Add to parent form with unique name based on index
        effect(() => {
            const indexValue = this.index();
            const controlName = `wmcOption_${indexValue}`;
            if (!this.parentForm.form.get(controlName)) {
                this.parentForm.form.addControl(controlName, this.wmcOptionForm);
            }
        });

        // Sync form with option values
        effect(() => {
            const optionValue = this.option();
            this.wmcOptionForm.patchValue(
                {
                    optionText: optionValue.option || '',
                    defaultScore: optionValue.defaultScore || 0,
                },
                { emitEvent: false },
            );
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const scoreControl = this.wmcOptionForm.get('defaultScore');
            if (scoreControl) {
                if (this.lotteryOn()) {
                    scoreControl.disable({ emitEvent: false });
                } else {
                    scoreControl.enable({ emitEvent: false });
                }
            }
        });

        // Sync form changes back to option object and emit to parent
        this.wmcOptionForm.get('optionText')?.valueChanges.subscribe((value) => {
            const optionValue = this.option();
            const questionValue = this.question();
            if (optionValue !== undefined && optionValue.option !== value) {
                optionValue.option = value;
                // Emit updated question to parent
                const updatedQuestion = {
                    ...questionValue,
                    options: [...questionValue.options],
                };
                this.questionChange.emit(updatedQuestion);
            }
        });

        this.wmcOptionForm.get('defaultScore')?.valueChanges.subscribe((value) => {
            const optionValue = this.option();
            const questionValue = this.question();
            if (optionValue !== undefined && optionValue.defaultScore !== value) {
                optionValue.defaultScore = value ?? 0;
                // Emit updated question to parent
                const updatedQuestion = {
                    ...questionValue,
                    options: [...questionValue.options],
                };
                this.questionChange.emit(updatedQuestion);
            }
        });
    }

    getRemoveTooltip(): string {
        if (this.allowRemoval()) {
            return this.translate.instant('i18n_remove');
        }
        if (this.lotteryOn()) {
            return this.translate.instant('i18n_action_disabled_lottery_on');
        }
        if (this.isInPublishedExam()) {
            const optionValue = this.option();
            const questionValue = this.question();
            const hasCorrectAnswer = questionValue.options.some(
                (o) => o !== optionValue && (o.correctOption || (o.defaultScore && o.defaultScore > 0)),
            );
            if (!hasCorrectAnswer) {
                return this.translate.instant('i18n_action_disabled_minimum_options');
            }
        }
        return this.translate.instant('i18n_remove');
    }

    removeOption() {
        if (!this.allowRemoval()) {
            return;
        }
        const optionValue = this.option();
        const questionValue = this.question();
        const hasCorrectAnswer = questionValue.options.some((o) => o !== optionValue && o.defaultScore > 0);
        if (hasCorrectAnswer) {
            const updatedQuestion = {
                ...questionValue,
                options: questionValue.options.filter((o) => o !== optionValue),
            };
            this.questionChange.emit(updatedQuestion);
        } else {
            this.toast.error(this.translate.instant('i18n_action_disabled_minimum_options'));
        }
    }

    getOptionStyle() {
        const optionValue = this.option();
        if (optionValue.defaultScore > 0) return 'question-correct-option';
        else if (optionValue.defaultScore < 0) return 'question-incorrect-option';
        else return '';
    }
}
