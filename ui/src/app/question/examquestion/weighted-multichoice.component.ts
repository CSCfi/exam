// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, effect, inject, input, model, signal } from '@angular/core';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion, ExamSectionQuestionOption } from 'src/app/question/question.model';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-eq-weighted-mc',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [
        ReactiveFormsModule,
        NgClass,
        NgbPopoverModule,
        TranslateModule,
        UpperCasePipe,
        FixedPrecisionValidatorDirective,
    ],
    styleUrls: ['../question.shared.scss'],
    templateUrl: './weighted-multichoice.component.html',
})
export class WeightedMultiChoiceComponent {
    question = model<ExamSectionQuestion | undefined>(undefined);
    lotteryOn = input(false);
    isInPublishedExam = input(false);

    weightedMcForm: FormGroup;
    private TranslateService = inject(TranslateService);
    private ToastrService = inject(ToastrService);
    private QuestionScore = inject(QuestionScoringService);
    private parentForm = inject(FormGroupDirective);
    private formInitialized = signal(false);

    constructor() {
        // Create nested form group with FormArray for options
        this.weightedMcForm = new FormGroup({
            negativeScore: new FormControl(false),
            optionShuffling: new FormControl(false),
            options: new FormArray<FormGroup>([]),
        });

        // Add to parent form
        this.parentForm.form.addControl('weightedMcq', this.weightedMcForm);

        // Sync form with question model signal
        effect(() => {
            const q = this.question();
            if (q) {
                this.updateFormArray(q.options);
                if (!this.formInitialized()) {
                    // Use reset() during initialization to mark form as pristine
                    this.weightedMcForm.reset(
                        {
                            negativeScore: q.negativeScoreAllowed || false,
                            optionShuffling: q.optionShufflingOn || false,
                        },
                        { emitEvent: false },
                    );
                    this.formInitialized.set(true);
                } else {
                    // Only sync from question → form if form is pristine
                    // If form is dirty, user has made changes - don't overwrite them
                    if (this.weightedMcForm.pristine) {
                        this.weightedMcForm.patchValue(
                            {
                                negativeScore: q.negativeScoreAllowed || false,
                                optionShuffling: q.optionShufflingOn || false,
                            },
                            { emitEvent: false },
                        );
                    }
                }
                // Subscribe to existing controls after initial setup
                this.subscribeToFormArrayControls();
            }
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const optionsArray = this.weightedMcForm.get('options') as FormArray;
            optionsArray.controls.forEach((control) => {
                const group = control as FormGroup;
                const scoreControl = group.get('score');
                if (scoreControl) {
                    if (this.lotteryOn()) {
                        scoreControl.disable({ emitEvent: false });
                    } else {
                        scoreControl.enable({ emitEvent: false });
                    }
                }
            });
        });

        // Sync form changes back to question model signal
        this.weightedMcForm.get('negativeScore')?.valueChanges.subscribe((value) => {
            const q = this.question();
            if (q && q.negativeScoreAllowed !== value) {
                this.question.update((current) => (current ? { ...current, negativeScoreAllowed: value } : current));
            }
        });

        this.weightedMcForm.get('optionShuffling')?.valueChanges.subscribe((value) => {
            const q = this.question();
            if (q && q.optionShufflingOn !== value) {
                this.question.update((current) => (current ? { ...current, optionShufflingOn: value } : current));
            }
        });

        // Note: Individual control subscriptions are set up in updateFormArray()
        // when form groups are created, to ensure we catch all changes
    }

    get optionsFormArray(): FormArray {
        return this.weightedMcForm.get('options') as FormArray;
    }
    get maxScore(): number {
        const q = this.question();
        return q ? this.QuestionScore.calculateWeightedMaxPoints(q) : 0;
    }

    get minScore(): number {
        const q = this.question();
        return q ? this.QuestionScore.calculateWeightedMinPoints(q) : 0;
    }

    addNewOption = () => {
        const q = this.question();
        if (!q) return;
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const newOption: ExamSectionQuestionOption = {
            id: -(Date.now() + Math.random()),
            option: { correctOption: false, option: '', defaultScore: 0 },
            score: 0,
            answered: false,
        };
        this.question.update((current) =>
            current ? { ...current, options: [...current.options, newOption] } : current,
        );
    };

    removeOption = (option: ExamSectionQuestionOption) => {
        const q = this.question();
        if (!q) return;
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }

        const hasCorrectAnswer = q.options.some(
            (o) =>
                o.id !== option.id &&
                (o.option?.correctOption || (o.option?.defaultScore && o.option.defaultScore > 0)),
        );

        if (!this.isInPublishedExam() || hasCorrectAnswer) {
            this.question.update((current) =>
                current ? { ...current, options: current.options.filter((o) => o.id !== option.id) } : current,
            );
        } else {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_minimum_options'));
        }
    };

    private subscribeToFormArrayControls() {
        this.optionsFormArray.controls.forEach((control) => {
            this.subscribeToFormGroup(control as FormGroup);
        });
    }

    private subscribeToFormGroup(formGroup: FormGroup) {
        formGroup.get('optionText')?.valueChanges.subscribe(() => this.syncFormToQuestion());
        formGroup.get('score')?.valueChanges.subscribe(() => this.syncFormToQuestion());
    }

    private updateFormArray(options: ExamSectionQuestionOption[]) {
        const optionsArray = this.optionsFormArray;
        const currentLength = optionsArray.length;
        const newLength = options.length;

        // Add new form groups
        for (let i = currentLength; i < newLength; i++) {
            const option = options[i];
            const scoreControl = new FormControl(option.score || 0, [Validators.required]);
            if (this.lotteryOn()) {
                scoreControl.disable({ emitEvent: false });
            }
            const newGroup = new FormGroup({
                optionText: new FormControl(option.option?.option || '', [Validators.required]),
                score: scoreControl,
            });
            optionsArray.push(newGroup);
            this.subscribeToFormGroup(newGroup);
        }

        // Remove excess form groups
        while (optionsArray.length > newLength) {
            optionsArray.removeAt(optionsArray.length - 1);
        }

        // Update existing form group values and disabled state
        options.forEach((option, index) => {
            const formGroup = optionsArray.at(index) as FormGroup;
            if (!formGroup) return;

            formGroup.patchValue(
                {
                    optionText: option.option?.option || '',
                    score: option.score || 0,
                },
                { emitEvent: false },
            );

            const scoreControl = formGroup.get('score');
            if (scoreControl) {
                if (this.lotteryOn()) {
                    scoreControl.disable({ emitEvent: false });
                } else {
                    scoreControl.enable({ emitEvent: false });
                }
            }
        });
    }

    private syncFormToQuestion() {
        const q = this.question();
        if (!q) return;

        const updatedOptions = q.options.map((opt, index) => {
            const formGroup = this.optionsFormArray.at(index) as FormGroup;
            if (!formGroup || !opt.option) return opt;

            const optionText = formGroup.get('optionText')?.value || '';
            const score = formGroup.get('score')?.value ?? 0;
            return {
                ...opt,
                option: { ...opt.option, option: optionText },
                score,
            };
        });

        this.question.update((current) => (current ? { ...current, options: updatedOptions } : current));
    }
}
