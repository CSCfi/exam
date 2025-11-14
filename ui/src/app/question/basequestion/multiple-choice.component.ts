// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { MultipleChoiceOptionEditorComponent } from './multiple-choice-option.component';
import { WeightedMultipleChoiceOptionEditorComponent } from './weighted-multiple-choice-option.component';

@Component({
    selector: 'xm-multiple-choice-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    templateUrl: './multiple-choice.component.html',
    styleUrls: ['../question.shared.scss'],
    imports: [
        ReactiveFormsModule,
        MultipleChoiceOptionEditorComponent,
        WeightedMultipleChoiceOptionEditorComponent,
        UpperCasePipe,
        TranslateModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceEditorComponent {
    question = input.required<Question | QuestionDraft>();
    showWarning = input(false);
    lotteryOn = input(false);
    allowOptionRemoval = input(false);

    questionChange = output<Question | QuestionDraft>();

    multipleChoiceForm: FormGroup;
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private QuestionScore = inject(QuestionScoringService);
    private parentForm = inject(FormGroupDirective);
    private formInitialized = signal(false);

    constructor() {
        // Create nested form group for multiple choice fields
        this.multipleChoiceForm = new FormGroup({
            defaultNegativeScoreAllowed: new FormControl(false),
            defaultOptionShufflingOn: new FormControl(false),
        });

        // Add to parent form
        this.parentForm.form.addControl('multipleChoice', this.multipleChoiceForm);

        // Delete defaultMaxScore for weighted multiple choice questions
        effect(() => {
            const questionValue = this.question();
            if (questionValue.type === 'WeightedMultipleChoiceQuestion') {
                delete questionValue.defaultMaxScore;
            }
            // Sync form with question values
            if (!this.formInitialized()) {
                // Use reset() during initialization to mark form as pristine
                this.multipleChoiceForm.reset(
                    {
                        defaultNegativeScoreAllowed: questionValue.defaultNegativeScoreAllowed || false,
                        defaultOptionShufflingOn: questionValue.defaultOptionShufflingOn || false,
                    },
                    { emitEvent: false },
                );
                this.formInitialized.set(true);
            } else {
                // Only sync from question → form if form is pristine
                // If form is dirty, user has made changes - don't overwrite them
                if (this.multipleChoiceForm.pristine) {
                    this.multipleChoiceForm.patchValue(
                        {
                            defaultNegativeScoreAllowed: questionValue.defaultNegativeScoreAllowed || false,
                            defaultOptionShufflingOn: questionValue.defaultOptionShufflingOn || false,
                        },
                        { emitEvent: false },
                    );
                }
            }
        });

        // Sync form changes back to question object
        this.multipleChoiceForm.get('defaultNegativeScoreAllowed')?.valueChanges.subscribe((value) => {
            const questionValue = this.question();
            if (questionValue !== undefined && questionValue.defaultNegativeScoreAllowed !== value) {
                questionValue.defaultNegativeScoreAllowed = value;
            }
        });

        this.multipleChoiceForm.get('defaultOptionShufflingOn')?.valueChanges.subscribe((value) => {
            const questionValue = this.question();
            if (questionValue !== undefined && questionValue.defaultOptionShufflingOn !== value) {
                questionValue.defaultOptionShufflingOn = value;
            }
        });
    }

    addNewOption() {
        if (this.lotteryOn()) {
            this.toast.error(this.translate.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const questionValue = this.question();
        const option: MultipleChoiceOption = {
            option: '',
            correctOption: false,
            defaultScore: 0,
        };
        const updatedQuestion = {
            ...questionValue,
            options: [...questionValue.options, option],
        };
        this.questionChange.emit(updatedQuestion);
    }

    calculateDefaultMaxPoints() {
        return this.QuestionScore.calculateDefaultMaxPoints(this.question() as Question);
    }

    calculateDefaultMinPoints() {
        return this.QuestionScore.calculateDefaultMinPoints(this.question() as Question);
    }
}
