// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output } from '@angular/core';
import {
    ControlContainer,
    FormArray,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestionOption } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';

@Component({
    selector: 'xm-eq-claim-choice',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, NgClass, NgbPopoverModule, TranslateModule, UpperCasePipe],
    styleUrls: ['../question.shared.scss'],
    templateUrl: './claim-choice.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimChoiceComponent {
    options = model.required<ExamSectionQuestionOption[]>();
    lotteryOn = input(false);
    optionsChanged = output<ExamSectionQuestionOption[]>(); // optional output to emit updated options
    missingOptions = computed<string[]>(() =>
        this.QuestionService.getInvalidDistributedClaimOptionTypes(this.options())
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.QuestionService.getOptionTypeTranslation(optionType)),
    );

    claimChoiceForm: FormGroup;
    private QuestionService = inject(QuestionService);
    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create nested form group with FormArray for options
        this.claimChoiceForm = new FormGroup({
            options: new FormArray<FormGroup>([]),
        });

        // Add to parent form
        this.parentForm.form.addControl('claimChoice', this.claimChoiceForm);

        // Sync form with options model signal
        effect(() => {
            const currentOptions = this.options();
            this.updateFormArray(currentOptions);
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

        // Sync form changes back to options model signal
        const optionsArray = this.claimChoiceForm.get('options') as FormArray;
        optionsArray.valueChanges.subscribe(() => {
            this.syncFormToOptions();
        });
    }

    get optionsFormArray(): FormArray {
        return this.claimChoiceForm.get('options') as FormArray;
    }

    getOptionFormGroup(index: number): FormGroup | null {
        const optionsArray = this.optionsFormArray;
        if (index < 0 || index >= optionsArray.length) {
            return null;
        }
        return optionsArray.at(index) as FormGroup;
    }

    determineOptionType(option: ExamSectionQuestionOption) {
        return this.QuestionService.determineClaimOptionTypeForExamQuestionOption(option);
    }

    translateDescription(option: ExamSectionQuestionOption) {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineOptionDescriptionTranslation(optionType);
    }

    getOptionClass(option: ExamSectionQuestionOption) {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineClaimChoiceOptionClass(optionType);
    }

    private updateFormArray(options: ExamSectionQuestionOption[]) {
        const optionsArray = this.optionsFormArray;
        const currentLength = optionsArray.length;
        const newLength = options.length;

        // Add or remove form groups to match options length
        if (newLength > currentLength) {
            for (let i = currentLength; i < newLength; i++) {
                const option = options[i];
                const isSkipOption = option.option?.claimChoiceType === 'SkipOption';
                optionsArray.push(
                    new FormGroup({
                        optionText: new FormControl(
                            { value: option.option?.option || '', disabled: this.lotteryOn() || isSkipOption },
                            [Validators.required],
                        ),
                        score: new FormControl(
                            { value: option.score || 0, disabled: this.lotteryOn() || isSkipOption },
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
                const isSkipOption = option.option?.claimChoiceType === 'SkipOption';
                formGroup.patchValue(
                    {
                        optionText: option.option?.option || '',
                        score: option.score || 0,
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
    }

    private syncFormToOptions() {
        const optionsArray = this.optionsFormArray;
        const currentOptions = this.options();
        const updatedOptions = currentOptions.map((opt, index) => {
            const formGroup = optionsArray.at(index) as FormGroup;
            if (formGroup) {
                const optionText = formGroup.get('optionText')?.value || '';
                const score = formGroup.get('score')?.value ?? 0;

                // Ensure we always have a valid MultipleChoiceOption
                // If opt.option exists, update it; otherwise create a new one
                const updatedOption: ExamSectionQuestionOption = {
                    ...opt,
                    option: opt.option
                        ? { ...opt.option, option: optionText }
                        : {
                              option: optionText,
                              correctOption: score > 0,
                              defaultScore: score,
                              claimChoiceType:
                                  score > 0 ? 'CorrectOption' : score < 0 ? 'IncorrectOption' : 'SkipOption',
                          },
                    score: score,
                };
                return updatedOption;
            }
            return opt;
        });
        this.options.set(updatedOptions);
        this.optionsChanged.emit(updatedOptions);
    }
}
