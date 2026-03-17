// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
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
import { ToastrService } from 'ngx-toastr';
import { skip } from 'rxjs';
import { multipleChoiceOptionsValidator } from 'src/app/question/editor/common/types/multiple-choice-validators';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import { MultipleChoiceOption } from 'src/app/question/question.model';

@Component({
    selector: 'xm-multiple-choice',
    templateUrl: './multiple-choice.component.html',
    styleUrls: ['../../question.shared.scss'],
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, UpperCasePipe, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceComponent implements OnInit, AfterViewInit {
    readonly question = input.required<ReverseQuestion | QuestionDraft>();
    readonly lotteryOn = input(false);
    readonly showWarning = input(false);
    readonly allowOptionRemoval = input(false);
    readonly multichoiceFeaturesOn = input(false);

    readonly multipleChoiceForm: FormGroup;

    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly QuestionScore = inject(QuestionScoringService);
    private readonly parentForm = inject(FormGroupDirective);

    constructor() {
        this.multipleChoiceForm = new FormGroup({
            defaultNegativeScoreAllowed: new FormControl(false),
            defaultOptionShufflingOn: new FormControl(false),
            options: new FormArray<FormGroup>([], [multipleChoiceOptionsValidator]),
        });

        toObservable(this.lotteryOn)
            .pipe(skip(1), takeUntilDestroyed())
            .subscribe((lotteryOn) => {
                const optionsArray = this.multipleChoiceForm.get('options') as FormArray;
                optionsArray.controls.forEach((control) => {
                    const group = control as FormGroup;
                    if (lotteryOn) {
                        group.get('optionText')?.disable({ emitEvent: false });
                        group.get('correctOption')?.disable({ emitEvent: false });
                    } else {
                        group.get('optionText')?.enable({ emitEvent: false });
                        group.get('correctOption')?.enable({ emitEvent: false });
                    }
                });
            });
    }

    get optionsFormArray(): FormArray {
        return this.multipleChoiceForm.get('options') as FormArray;
    }

    ngOnInit() {
        const questionValue = this.question();
        this.multipleChoiceForm.reset(
            {
                defaultNegativeScoreAllowed: questionValue.defaultNegativeScoreAllowed || false,
                defaultOptionShufflingOn: questionValue.defaultOptionShufflingOn || false,
            },
            { emitEvent: false },
        );
        this.updateFormArray(questionValue.options);
    }

    ngAfterViewInit() {
        // Add to parent form - parent form is guaranteed to be initialized at this point
        this.parentForm.form.addControl('multipleChoice', this.multipleChoiceForm);

        // Propagate dirty and valid state from multipleChoice form to parent form
        this.multipleChoiceForm.valueChanges.subscribe(() => {
            if (this.multipleChoiceForm.dirty) {
                this.parentForm.form.markAsDirty();
            }
        });

        // Propagate valid state changes
        this.multipleChoiceForm.statusChanges.subscribe(() => {
            if (this.multipleChoiceForm.invalid) {
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
            correctOption: new FormControl(false),
        });
        optionsArray.push(newOptionGroup);
        this.multipleChoiceForm.markAsDirty();
    }

    removeOption(index: number) {
        if (!this.allowOptionRemoval() || this.lotteryOn()) {
            return;
        }
        const optionsArray = this.optionsFormArray;
        const formGroup = optionsArray.at(index) as FormGroup;
        const isCorrect = formGroup?.get('correctOption')?.value;

        // Check if removing this option would leave no correct answer
        const hasOtherCorrectAnswer = optionsArray.controls.some((control, i) => {
            if (i === index) return false;
            const group = control as FormGroup;
            return group.get('correctOption')?.value === true;
        });

        if (isCorrect && !hasOtherCorrectAnswer) {
            this.toast.error(this.translate.instant('i18n_action_disabled_minimum_options'));
            return;
        }

        optionsArray.removeAt(index);
        this.multipleChoiceForm.markAsDirty();
    }

    onCorrectOptionChange(index: number, event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            // Radio button was unchecked - this shouldn't happen, but handle it
            return;
        }

        const optionsArray = this.optionsFormArray;

        // Update all options: set clicked one to true, others to false
        // Radio buttons are naturally mutually exclusive, so we just need to sync the form values
        optionsArray.controls.forEach((control, i) => {
            const group = control as FormGroup;
            const correctOptionControl = group.get('correctOption');
            if (i === index) {
                correctOptionControl?.setValue(true, { emitEvent: false });
            } else {
                correctOptionControl?.setValue(false, { emitEvent: false });
            }
        });

        this.multipleChoiceForm.markAsDirty();
    }

    getRemoveTooltip(index: number): string {
        if (this.allowOptionRemoval() && !this.lotteryOn()) {
            const optionsArray = this.optionsFormArray;
            const formGroup = optionsArray.at(index) as FormGroup;
            const isCorrect = formGroup?.get('correctOption')?.value;

            // Check if removing this option would leave no correct answer
            const hasOtherCorrectAnswer = optionsArray.controls.some((control, i) => {
                if (i === index) return false;
                const group = control as FormGroup;
                return group.get('correctOption')?.value === true;
            });

            if (isCorrect && !hasOtherCorrectAnswer) {
                return this.translate.instant('i18n_action_disabled_minimum_options');
            }
            return this.translate.instant('i18n_remove');
        }
        if (this.lotteryOn()) {
            return this.translate.instant('i18n_action_disabled_lottery_on');
        }
        return this.translate.instant('i18n_remove');
    }

    calculateDefaultMaxPoints(): number {
        return this.QuestionScore.calculateDefaultMaxPoints(this.question().options);
    }

    calculateDefaultMinPoints(): number {
        return this.QuestionScore.calculateDefaultMinPoints(
            this.question().options,
            this.question().defaultNegativeScoreAllowed,
        );
    }

    private updateFormArray(options: MultipleChoiceOption[]) {
        const optionsArray = this.optionsFormArray;
        const currentLength = optionsArray.length;
        const newLength = options.length;

        // Add or remove form groups to match options length
        if (newLength > currentLength) {
            for (let i = currentLength; i < newLength; i++) {
                const option = options[i];
                const isCorrect = option.correctOption || false;
                const optionGroup = new FormGroup({
                    optionText: new FormControl({ value: option.option || '', disabled: this.lotteryOn() }, [
                        Validators.required,
                    ]),
                    correctOption: new FormControl({ value: isCorrect, disabled: this.lotteryOn() || isCorrect }),
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
                const isCorrect = option.correctOption || false;
                formGroup.patchValue(
                    {
                        optionText: option.option || '',
                        correctOption: isCorrect,
                    },
                    { emitEvent: false },
                );

                // Update disabled state
                const optionTextControl = formGroup.get('optionText');
                const correctOptionControl = formGroup.get('correctOption');
                if (this.lotteryOn()) {
                    optionTextControl?.disable({ emitEvent: false });
                    correctOptionControl?.disable({ emitEvent: false });
                } else {
                    optionTextControl?.enable({ emitEvent: false });
                    correctOptionControl?.enable({ emitEvent: false });
                }
            }
        });
    }
}
