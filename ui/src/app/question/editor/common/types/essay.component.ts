// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    ControlContainer,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { skip } from 'rxjs';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';

@Component({
    selector: 'xm-essay',
    templateUrl: './essay.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EssayComponent implements OnInit, AfterViewInit {
    readonly question = input.required<ReverseQuestion | QuestionDraft>();
    readonly lotteryOn = input(false);

    readonly essayForm: FormGroup;

    private readonly parentForm = inject(FormGroupDirective);

    constructor() {
        this.essayForm = new FormGroup({
            defaultExpectedWordCount: new FormControl<number | null>(null, [
                Validators.min(1),
                Validators.max(1000000),
            ]),
            defaultEvaluationType: new FormControl<string>('Points', [Validators.required]),
        });

        toObservable(this.lotteryOn)
            .pipe(skip(1), takeUntilDestroyed())
            .subscribe((lotteryOn) => {
                const evaluationTypeControl = this.essayForm.get('defaultEvaluationType');
                if (lotteryOn) {
                    evaluationTypeControl?.disable({ emitEvent: false });
                } else {
                    evaluationTypeControl?.enable({ emitEvent: false });
                }
            });

        this.essayForm.get('defaultEvaluationType')?.valueChanges.subscribe((evaluationType) => {
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

    ngOnInit() {
        const questionValue = this.question();
        this.essayForm.patchValue(
            {
                defaultExpectedWordCount: questionValue.defaultExpectedWordCount || null,
                defaultEvaluationType: questionValue.defaultEvaluationType || 'Points',
            },
            { emitEvent: false },
        );
        const evaluationTypeControl = this.essayForm.get('defaultEvaluationType');
        if (this.lotteryOn()) {
            evaluationTypeControl?.disable({ emitEvent: false });
        }
    }

    /**
     * Estimate characters based on word count
     * Uses the word count control value
     */
    estimateCharacters(): number {
        const wordCountControl = this.essayForm.get('defaultExpectedWordCount');
        const wordCount = wordCountControl?.value ?? 0;
        return wordCount * 8;
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
        if (this.question()?.defaultEvaluationType === 'Selection') {
            const maxScoreControl = this.parentForm.form.get('defaultMaxScore');
            if (maxScoreControl) {
                maxScoreControl.setValue(0, { emitEvent: false });
                maxScoreControl.disable({ emitEvent: false });
            }
        }
    }
}
