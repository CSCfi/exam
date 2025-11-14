// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import {
    ControlContainer,
    FormArray,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import { MultipleChoiceOption } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-claim-choice-trial',
    standalone: true,
    templateUrl: './claim-choice.component.html',
    styleUrls: ['../question/question.shared.scss'],
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, NgClass, FixedPrecisionValidatorDirective, UpperCasePipe, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimChoiceTrialComponent implements AfterViewInit {
    question = input.required<ReverseQuestion | QuestionDraft>();
    lotteryOn = input(false);
    showWarning = input(false);

    missingOption = signal('');

    claimChoiceForm: FormGroup;
    private translate = inject(TranslateService);
    private Question = inject(QuestionService);
    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create nested form group with FormArray for options
        this.claimChoiceForm = new FormGroup({
            options: new FormArray<FormGroup>([]),
        });

        // Initialize options when question is new
        effect(() => {
            const questionValue = this.question();
            const { state, question: questionText } = questionValue;
            if (state === 'NEW' && questionText === '') {
                const { correct, wrong, skip } = this.defaultOptions;
                questionValue.options = [correct, wrong, skip];
            }
            // Sync form with question options
            this.updateFormArray(questionValue.options);
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const optionsArray = this.claimChoiceForm.get('options') as FormArray;
            optionsArray.controls.forEach((control) => {
                const group = control as FormGroup;
                const optionTextControl = group.get('optionText');
                const scoreControl = group.get('score');
                const isSkipOption = group.get('isSkipOption')?.value;

                if (this.lotteryOn() || isSkipOption) {
                    optionTextControl?.disable({ emitEvent: false });
                    scoreControl?.disable({ emitEvent: false });
                } else {
                    optionTextControl?.enable({ emitEvent: false });
                    scoreControl?.enable({ emitEvent: false });
                }
            });
        });
    }

    get optionsFormArray(): FormArray {
        return this.claimChoiceForm.get('options') as FormArray;
    }

    private get defaultOptions() {
        return {
            correct: {
                option: this.translate.instant('i18n_claim_choice_default_correct'),
                defaultScore: 1,
                correctOption: true,
                claimChoiceType: 'CorrectOption',
            },
            wrong: {
                option: this.translate.instant('i18n_claim_choice_default_incorrect'),
                defaultScore: -1,
                correctOption: false,
                claimChoiceType: 'IncorrectOption',
            },
            skip: {
                option: this.translate.instant('i18n_question_claim_skip'),
                defaultScore: 0,
                correctOption: false,
                claimChoiceType: 'SkipOption',
            },
        };
    }

    ngAfterViewInit() {
        // Add to parent form - parent form is guaranteed to be initialized at this point
        this.parentForm.form.addControl('claimChoice', this.claimChoiceForm);

        // Propagate dirty and valid state from claimChoice form to parent form
        this.claimChoiceForm.valueChanges.subscribe(() => {
            if (this.claimChoiceForm.dirty) {
                this.parentForm.form.markAsDirty();
            }
        });

        // Propagate valid state changes
        this.claimChoiceForm.statusChanges.subscribe(() => {
            if (this.claimChoiceForm.invalid) {
                this.parentForm.form.markAsTouched();
            }
        });
    }

    getOptionDescriptionTranslation(option: MultipleChoiceOption): string {
        return this.Question.determineOptionDescriptionTranslation(option.claimChoiceType as string);
    }

    getOptionClass(option: MultipleChoiceOption) {
        return this.Question.determineClaimChoiceOptionClass(option.claimChoiceType as string);
    }

    private updateFormArray(options: MultipleChoiceOption[]) {
        const optionsArray = this.optionsFormArray;
        const currentLength = optionsArray.length;
        const newLength = options.length;

        // Add or remove form groups to match options length
        if (newLength > currentLength) {
            for (let i = currentLength; i < newLength; i++) {
                const option = options[i];
                const isSkipOption = option.claimChoiceType === 'SkipOption';
                optionsArray.push(
                    new FormGroup({
                        optionText: new FormControl(
                            { value: option.option || '', disabled: this.lotteryOn() || isSkipOption },
                            [Validators.required],
                        ),
                        score: new FormControl(
                            { value: option.defaultScore || 0, disabled: this.lotteryOn() || isSkipOption },
                            [Validators.required],
                        ),
                        isSkipOption: new FormControl(isSkipOption),
                    }),
                );
            }
        } else if (newLength < currentLength) {
            for (let i = currentLength - 1; i >= newLength; i--) {
                optionsArray.removeAt(i);
            }
        }

        // Update existing form group values
        options.forEach((option, index) => {
            const formGroup = optionsArray.at(index) as FormGroup;
            if (formGroup) {
                const isSkipOption = option.claimChoiceType === 'SkipOption';
                formGroup.patchValue(
                    {
                        optionText: option.option || '',
                        score: option.defaultScore || 0,
                        isSkipOption: isSkipOption,
                    },
                    { emitEvent: false },
                );

                // Update disabled state
                const optionTextControl = formGroup.get('optionText');
                const scoreControl = formGroup.get('score');
                if (this.lotteryOn() || isSkipOption) {
                    optionTextControl?.disable({ emitEvent: false });
                    scoreControl?.disable({ emitEvent: false });
                } else {
                    optionTextControl?.enable({ emitEvent: false });
                    scoreControl?.enable({ emitEvent: false });
                }
            }
        });

        // Update missingOption signal
        const missingOptionValue = this.Question.getInvalidClaimOptionTypes(options)
            .filter((type) => type !== 'SkipOption')
            .map((type) => this.Question.getOptionTypeTranslation(type))[0];
        this.missingOption.set(missingOptionValue || '');
    }
}
