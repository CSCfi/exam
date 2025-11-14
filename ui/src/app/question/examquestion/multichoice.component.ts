// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
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
import { ExamSectionQuestion, ExamSectionQuestionOption } from 'src/app/question/question.model';
import { multipleChoiceOptionsValidator } from 'src/app/question/shared/multiple-choice-validators';

@Component({
    selector: 'xm-eq-unweighted-mc',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, NgClass, NgbPopoverModule, TranslateModule],
    styleUrls: ['../question.shared.scss'],
    templateUrl: './multichoice.component.html',
})
export class MultiChoiceComponent {
    question = model<ExamSectionQuestion | undefined>(undefined);
    lotteryOn = input(false);
    isInPublishedExam = input(false);

    multichoiceForm: FormGroup;
    private TranslateService = inject(TranslateService);
    private ToastrService = inject(ToastrService);
    private parentForm = inject(FormGroupDirective);
    private formInitialized = signal(false);

    constructor() {
        // Create nested form group with FormArray for options
        this.multichoiceForm = new FormGroup({
            optionShuffling: new FormControl(false),
            options: new FormArray<FormGroup>([], [multipleChoiceOptionsValidator]),
        });

        // Add to parent form
        this.parentForm.form.addControl('unweightedMc', this.multichoiceForm);

        // Sync form with question model signal
        effect(() => {
            const q = this.question();
            if (q) {
                this.updateFormArray(q.options);
                if (!this.formInitialized()) {
                    // Use reset() during initialization to mark form as pristine
                    this.multichoiceForm.reset({ optionShuffling: q.optionShufflingOn || false }, { emitEvent: false });
                    this.formInitialized.set(true);
                } else {
                    // Only sync from question → form if form is pristine
                    // If form is dirty, user has made changes - don't overwrite them
                    if (this.multichoiceForm.pristine) {
                        this.multichoiceForm.patchValue(
                            { optionShuffling: q.optionShufflingOn || false },
                            { emitEvent: false },
                        );
                    }
                }
                // Subscribe to existing controls after initial setup
                this.subscribeToFormArrayControls();
            }
        });

        // Sync form changes back to question model signal
        this.multichoiceForm.get('optionShuffling')?.valueChanges.subscribe((value) => {
            const q = this.question();
            if (q && q.optionShufflingOn !== value) {
                this.question.update((current) => (current ? { ...current, optionShufflingOn: value } : current));
            }
        });

        // Note: Individual control subscriptions are set up in updateFormArray()
        // when form groups are created, to ensure we catch all changes
    }

    get optionsFormArray(): FormArray {
        return this.multichoiceForm.get('options') as FormArray;
    }

    updateCorrectAnswer = (index: number, event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const q = this.question();
        if (!q) return;

        const formGroup = this.optionsFormArray.at(index) as FormGroup;
        const currentValue = formGroup?.get('correctOption')?.value || false;
        const newValue = !currentValue;

        // Update form controls
        this.optionsFormArray.controls.forEach((control, i) => {
            const group = control as FormGroup;
            const correctOptionControl = group.get('correctOption');
            if (!correctOptionControl) return;

            if (i === index) {
                correctOptionControl.setValue(newValue, { emitEvent: false });
                if (newValue) {
                    correctOptionControl.disable({ emitEvent: false });
                } else {
                    correctOptionControl.enable({ emitEvent: false });
                }
            } else {
                correctOptionControl.setValue(false, { emitEvent: false });
                correctOptionControl.enable({ emitEvent: false });
            }
        });

        // Update question model
        const updatedOptions = q.options.map((opt, i) => {
            if (!opt.option) return opt;
            return {
                ...opt,
                option: { ...opt.option, correctOption: i === index ? newValue : false },
            };
        });

        this.question.update((current) => (current ? { ...current, options: updatedOptions } : current));
    };

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

    private updateFormArray(options: ExamSectionQuestionOption[]) {
        const optionsArray = this.optionsFormArray;
        const currentLength = optionsArray.length;
        const newLength = options.length;

        // Add new form groups
        for (let i = currentLength; i < newLength; i++) {
            const option = options[i];
            const newGroup = new FormGroup({
                optionText: new FormControl(option.option?.option || '', [Validators.required]),
                correctOption: new FormControl(option.option?.correctOption || false),
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
                    correctOption: option.option?.correctOption || false,
                },
                { emitEvent: false },
            );

            const correctOptionControl = formGroup.get('correctOption');
            if (correctOptionControl) {
                if (option.option?.correctOption) {
                    correctOptionControl.disable({ emitEvent: false });
                } else {
                    correctOptionControl.enable({ emitEvent: false });
                }
            }
        });
    }

    private subscribeToFormGroup(formGroup: FormGroup) {
        formGroup.get('optionText')?.valueChanges.subscribe(() => this.syncFormToQuestion());
        formGroup.get('correctOption')?.valueChanges.subscribe(() => this.syncFormToQuestion());
    }

    private syncFormToQuestion() {
        const q = this.question();
        if (!q) return;

        const updatedOptions = q.options.map((opt, index) => {
            const formGroup = this.optionsFormArray.at(index) as FormGroup;
            if (!formGroup || !opt.option) return opt;

            const optionText = formGroup.get('optionText')?.value || '';
            const correctOption = formGroup.get('correctOption')?.value || false;
            return {
                ...opt,
                option: { ...opt.option, option: optionText, correctOption },
            };
        });

        this.question.update((current) => (current ? { ...current, options: updatedOptions } : current));
    }
}
