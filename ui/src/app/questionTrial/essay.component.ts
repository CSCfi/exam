// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';

@Component({
    selector: 'xm-essay-trial',
    standalone: true,
    templateUrl: './essay.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EssayTrialComponent implements AfterViewInit {
    question = input.required<ReverseQuestion | QuestionDraft>();
    lotteryOn = input(false);

    essayForm: FormGroup;
    private parentForm = inject(FormGroupDirective);

    constructor() {
        // Create nested form group for essay fields
        this.essayForm = new FormGroup({
            defaultExpectedWordCount: new FormControl<number | null>(null, [
                Validators.min(1),
                Validators.max(1000000),
            ]),
            defaultEvaluationType: new FormControl<string>('Points'),
        });

        // Sync form from question data when available
        effect(() => {
            const questionValue = this.question();
            if (questionValue && this.essayForm.pristine) {
                this.essayForm.patchValue(
                    {
                        defaultExpectedWordCount: questionValue.defaultExpectedWordCount || null,
                        defaultEvaluationType: questionValue.defaultEvaluationType || 'Points',
                    },
                    { emitEvent: false },
                );
            }
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const evaluationTypeControl = this.essayForm.get('defaultEvaluationType');
            if (evaluationTypeControl) {
                if (this.lotteryOn()) {
                    evaluationTypeControl.disable({ emitEvent: false });
                } else {
                    evaluationTypeControl.enable({ emitEvent: false });
                }
            }
        });

        // Handle max score when evaluation type changes to 'Selection'
        this.essayForm.get('defaultEvaluationType')?.valueChanges.subscribe((evaluationType) => {
            // Access questionBody form via parent form (top-level questionForm)
            const maxScoreControl = this.parentForm.form.get('defaultMaxScore');
            if (maxScoreControl) {
                if (evaluationType === 'Selection') {
                    maxScoreControl.setValue(0, { emitEvent: false });
                    maxScoreControl.disable({ emitEvent: false });
                } else {
                    maxScoreControl.enable({ emitEvent: false });
                }
            }
        });
    }

    ngAfterViewInit() {
        // Add to parent form - parent form is guaranteed to be initialized at this point
        this.parentForm.form.addControl('essay', this.essayForm);

        // Propagate dirty and valid state from essay form to parent form
        // When essay form becomes dirty, mark parent form as dirty too
        this.essayForm.valueChanges.subscribe(() => {
            if (this.essayForm.dirty) {
                this.parentForm.form.markAsDirty();
            }
        });

        // Propagate valid state changes
        this.essayForm.statusChanges.subscribe(() => {
            if (this.essayForm.invalid) {
                this.parentForm.form.markAsTouched();
            }
        });

        // Handle initial state for max score if evaluation type is 'Selection'
        const questionValue = this.question();
        if (questionValue?.defaultEvaluationType === 'Selection') {
            const maxScoreControl = this.parentForm.form.get('defaultMaxScore');
            if (maxScoreControl) {
                maxScoreControl.setValue(0, { emitEvent: false });
                maxScoreControl.disable({ emitEvent: false });
            }
        }
    }

    estimateCharacters(): number {
        const wordCount = this.essayForm.get('defaultExpectedWordCount')?.value;
        return (wordCount || 0) * 8;
    }
}
