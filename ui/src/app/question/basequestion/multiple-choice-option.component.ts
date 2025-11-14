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
import { QuestionService } from 'src/app/question/question.service';

@Component({
    selector: 'xm-mc-option-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    template: `
        <div [formGroup]="mcOptionForm" class="m-0 p-0 exclude">
            <div class="row">
                <div
                    class="col-md-6 question-option-empty"
                    [ngClass]="{ 'question-correct-option': option().correctOption }"
                >
                    <textarea
                        type="text"
                        rows="1"
                        name="option-{{ index() }}"
                        class="make-inline question-option-input radiobut form-control"
                        formControlName="optionText"
                        required
                    ></textarea>
                </div>
                <div
                    class="col-md-2 question-option-empty-radio"
                    [ngClass]="{ 'question-correct-option-radio': option().correctOption }"
                >
                    <input
                        type="radio"
                        formControlName="correctOption"
                        name="correctOption"
                        [value]="true"
                        (click)="correctAnswerToggled($event)"
                        class="make-inline question-option-radio"
                    />
                </div>

                <button
                    (click)="removeOption()"
                    class="col-md-1 question-option-trash btn btn-link"
                    [disabled]="!allowRemoval()"
                    [title]="getRemoveTooltip()"
                >
                    <i class="bi-trash"></i>
                </button>
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    imports: [ReactiveFormsModule, NgClass, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceOptionEditorComponent {
    option = input.required<MultipleChoiceOption>();
    index = input(0);
    question = input.required<Question | QuestionDraft>();
    allowRemoval = input(false);
    lotteryOn = input(false);
    isInPublishedExam = input(false);

    questionChange = output<Question | QuestionDraft>();

    mcOptionForm: FormGroup;
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Question = inject(QuestionService);
    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create nested form group for this option
        this.mcOptionForm = new FormGroup({
            optionText: new FormControl('', [Validators.required]),
            correctOption: new FormControl(false),
        });

        // Add to parent form with unique name based on index
        effect(() => {
            const indexValue = this.index();
            const controlName = `mcOption_${indexValue}`;
            if (!this.parentForm.form.get(controlName)) {
                this.parentForm.form.addControl(controlName, this.mcOptionForm);
            }
        });

        // Sync form with option values
        effect(() => {
            const optionValue = this.option();
            this.mcOptionForm.patchValue(
                {
                    optionText: optionValue.option || '',
                    correctOption: optionValue.correctOption || false,
                },
                { emitEvent: false },
            );

            // Update disabled state for radio button
            const correctOptionControl = this.mcOptionForm.get('correctOption');
            if (correctOptionControl) {
                if (optionValue.correctOption) {
                    correctOptionControl.disable({ emitEvent: false });
                } else {
                    correctOptionControl.enable({ emitEvent: false });
                }
            }
        });

        // Sync form changes back to option object and emit to parent
        this.mcOptionForm.get('optionText')?.valueChanges.subscribe((value) => {
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

        this.mcOptionForm.get('correctOption')?.valueChanges.subscribe((value) => {
            const optionValue = this.option();
            const questionValue = this.question();
            if (optionValue !== undefined && optionValue.correctOption !== value) {
                optionValue.correctOption = value;
                // Emit updated question to parent
                const updatedQuestion = {
                    ...questionValue,
                    options: [...questionValue.options],
                };
                this.questionChange.emit(updatedQuestion);
            }
        });
    }

    correctAnswerToggled(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        const optionValue = this.option();
        const questionValue = this.question();
        const currentValue = optionValue.correctOption || false;
        const newValue = !currentValue;

        // Update form control
        const correctOptionControl = this.mcOptionForm.get('correctOption');
        if (correctOptionControl) {
            correctOptionControl.setValue(newValue, { emitEvent: false });
            if (newValue) {
                correctOptionControl.disable({ emitEvent: false });
            } else {
                correctOptionControl.enable({ emitEvent: false });
            }
        }

        // Update all options: set clicked one to newValue, others to false
        const updatedOptions = questionValue.options.map((opt) => {
            if (opt === optionValue) {
                return { ...opt, correctOption: newValue };
            } else {
                return { ...opt, correctOption: false };
            }
        });

        const updatedQuestion = {
            ...questionValue,
            options: updatedOptions,
        };
        this.questionChange.emit(updatedQuestion);
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
            const hasCorrectAnswer = questionValue.options.some((o) => o !== optionValue && o.correctOption);
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
        const hasCorrectAnswer = questionValue.options.some((o) => o !== optionValue && o.correctOption);
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
}
