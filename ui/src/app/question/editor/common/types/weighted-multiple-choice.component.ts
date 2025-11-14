// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';
import {
    AbstractControl,
    ControlContainer,
    FormArray,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { startWith } from 'rxjs';
import { minOptionsValidator } from 'src/app/question/editor/common/types/multiple-choice-validators';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import { MultipleChoiceOption } from 'src/app/question/question.model';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-weighted-multiple-choice',
    templateUrl: './weighted-multiple-choice.component.html',
    styleUrls: ['../../question.shared.scss'],
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, NgClass, UpperCasePipe, TranslateModule, FixedPrecisionValidatorDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightedMultipleChoiceComponent implements AfterViewInit {
    question = input.required<ReverseQuestion | QuestionDraft>();
    lotteryOn = input(false);
    showWarning = input(false);
    allowOptionRemoval = input(false);

    weightedMcForm: FormGroup;

    // Convert form valueChanges to a signal for reactive updates
    formValues = signal<Record<string, unknown> | null>(null);

    // Computed values that react to form changes
    maxPoints = computed(() => {
        // Access formValues to track changes
        this.formValues();
        const optionsArray = this.optionsFormArray;
        const max = optionsArray.controls
            .map((control) => {
                const group = control as FormGroup;
                const score = group.get('defaultScore')?.value ?? 0;
                return score > 0 ? score : 0;
            })
            .reduce((a, b) => a + b, 0);
        return parseFloat(max.toFixed(2));
    });

    minPoints = computed(() => {
        // Access formValues to track changes
        this.formValues();
        const negativeScoreAllowed = this.weightedMcForm.get('negativeScore')?.value ?? false;
        if (!negativeScoreAllowed) {
            return 0;
        }
        const optionsArray = this.optionsFormArray;
        const min = optionsArray.controls
            .map((control) => {
                const group = control as FormGroup;
                const score = group.get('defaultScore')?.value ?? 0;
                return score < 0 ? score : 0;
            })
            .reduce((a, b) => a + b, 0);
        return parseFloat(min.toFixed(2));
    });

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private parentForm = inject(FormGroupDirective);
    private formInitialized = signal(false);

    constructor() {
        // Create nested form group with FormArray for options
        this.weightedMcForm = new FormGroup({
            negativeScore: new FormControl(false),
            optionShuffling: new FormControl(false),
            options: new FormArray<FormGroup>([], [minOptionsValidator(2)]),
        });

        // Subscribe to form valueChanges to update the signal
        this.weightedMcForm.valueChanges.pipe(startWith(this.weightedMcForm.value)).subscribe((value) => {
            this.formValues.set(value);
        });

        // Sync form with question values
        effect(() => {
            const questionValue = this.question();
            if (!this.formInitialized()) {
                // Use reset() during initialization to mark form as pristine
                this.weightedMcForm.reset(
                    {
                        negativeScore: questionValue.defaultNegativeScoreAllowed || false,
                        optionShuffling: questionValue.defaultOptionShufflingOn || false,
                    },
                    { emitEvent: false },
                );
                this.updateFormArray(questionValue.options);
                this.formInitialized.set(true);
            } else {
                // Only sync from question → form if form is pristine
                if (this.weightedMcForm.pristine) {
                    this.weightedMcForm.patchValue(
                        {
                            negativeScore: questionValue.defaultNegativeScoreAllowed || false,
                            optionShuffling: questionValue.defaultOptionShufflingOn || false,
                        },
                        { emitEvent: false },
                    );
                    this.updateFormArray(questionValue.options);
                }
            }
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const optionsArray = this.weightedMcForm.get('options') as FormArray;
            optionsArray.controls.forEach((control) => {
                const group = control as FormGroup;
                const optionTextControl = group.get('optionText');
                const scoreControl = group.get('defaultScore');

                if (this.lotteryOn()) {
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
        return this.weightedMcForm.get('options') as FormArray;
    }

    ngAfterViewInit() {
        // Add to parent form - parent form is guaranteed to be initialized at this point
        this.parentForm.form.addControl('weightedMc', this.weightedMcForm);

        // Propagate dirty and valid state from weightedMc form to parent form
        this.weightedMcForm.valueChanges.subscribe(() => {
            if (this.weightedMcForm.dirty) {
                this.parentForm.form.markAsDirty();
            }
        });

        // Propagate valid state changes
        this.weightedMcForm.statusChanges.subscribe(() => {
            if (this.weightedMcForm.invalid) {
                this.parentForm.form.markAsTouched();
            }
        });
    }

    addNewOption() {
        if (this.lotteryOn()) {
            this.toast.error(this.translate.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const optionsArray = this.optionsFormArray;
        const newOptionGroup = new FormGroup({
            optionText: new FormControl('', [Validators.required]),
            defaultScore: new FormControl(0, [Validators.required]),
        });
        optionsArray.push(newOptionGroup);
        this.weightedMcForm.markAsDirty();
    }

    removeOption(index: number) {
        if (!this.allowOptionRemoval() || this.lotteryOn()) {
            return;
        }
        const optionsArray = this.optionsFormArray;
        const formGroup = optionsArray.at(index) as FormGroup;
        const score = formGroup?.get('defaultScore')?.value ?? 0;

        // Check if removing this option would leave no positive score
        const hasOtherPositiveScore = optionsArray.controls.some((control, i) => {
            if (i === index) return false;
            const group = control as FormGroup;
            const optionScore = group.get('defaultScore')?.value ?? 0;
            return optionScore > 0;
        });

        if (score > 0 && !hasOtherPositiveScore) {
            this.toast.error(this.translate.instant('i18n_action_disabled_minimum_options'));
            return;
        }

        optionsArray.removeAt(index);
        this.weightedMcForm.markAsDirty();
    }

    getRemoveTooltip(index: number): string {
        if (this.allowOptionRemoval() && !this.lotteryOn()) {
            const optionsArray = this.optionsFormArray;
            const formGroup = optionsArray.at(index) as FormGroup;
            const score = formGroup?.get('defaultScore')?.value ?? 0;

            // Check if removing this option would leave no positive score
            const hasOtherPositiveScore = optionsArray.controls.some((control, i) => {
                if (i === index) return false;
                const group = control as FormGroup;
                const optionScore = group.get('defaultScore')?.value ?? 0;
                return optionScore > 0;
            });

            if (score > 0 && !hasOtherPositiveScore) {
                return this.translate.instant('i18n_action_disabled_minimum_options');
            }
            return this.translate.instant('i18n_remove');
        }
        if (this.lotteryOn()) {
            return this.translate.instant('i18n_action_disabled_lottery_on');
        }
        return this.translate.instant('i18n_remove');
    }

    getOptionStyle(optionGroup: AbstractControl): string {
        const formGroup = optionGroup as FormGroup;
        const score = formGroup.get('defaultScore')?.value ?? 0;
        if (score > 0) return 'question-correct-option';
        else if (score < 0) return 'question-incorrect-option';
        else return '';
    }

    calculateDefaultMaxPoints(): number {
        return this.maxPoints();
    }

    calculateDefaultMinPoints(): number {
        return this.minPoints();
    }

    private updateFormArray(options: MultipleChoiceOption[]) {
        const optionsArray = this.optionsFormArray;
        const currentLength = optionsArray.length;
        const newLength = options.length;

        // Add or remove form groups to match options length
        if (newLength > currentLength) {
            for (let i = currentLength; i < newLength; i++) {
                const option = options[i];
                const optionGroup = new FormGroup({
                    optionText: new FormControl({ value: option.option || '', disabled: this.lotteryOn() }, [
                        Validators.required,
                    ]),
                    defaultScore: new FormControl({ value: option.defaultScore || 0, disabled: this.lotteryOn() }, [
                        Validators.required,
                    ]),
                });
                optionsArray.push(optionGroup);
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
                formGroup.patchValue(
                    {
                        optionText: option.option || '',
                        defaultScore: option.defaultScore || 0,
                    },
                    { emitEvent: false },
                );

                // Update disabled state
                const optionTextControl = formGroup.get('optionText');
                const scoreControl = formGroup.get('defaultScore');
                if (this.lotteryOn()) {
                    optionTextControl?.disable({ emitEvent: false });
                    scoreControl?.disable({ emitEvent: false });
                } else {
                    optionTextControl?.enable({ emitEvent: false });
                    scoreControl?.enable({ emitEvent: false });
                }
            }
        });
    }
}
