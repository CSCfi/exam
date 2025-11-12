// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-claim-choice-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    templateUrl: './claim-choice.component.html',
    styleUrls: ['../question.shared.scss'],
    imports: [FormsModule, NgClass, FixedPrecisionValidatorDirective, UpperCasePipe, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClaimChoiceEditorComponent {
    question = input.required<Question | QuestionDraft>();
    lotteryOn = input(false);
    showWarning = input(false);

    missingOption = signal('');

    private translate = inject(TranslateService);
    private Question = inject(QuestionService);

    constructor() {
        // Initialize options when question is new
        effect(() => {
            const questionValue = this.question();
            const { state, question: questionText } = questionValue;
            if (state === 'NEW' && questionText === '') {
                const { correct, wrong, skip } = this.defaultOptions;
                questionValue.options = [correct, wrong, skip];
            }
        });
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

    getOptionDescriptionTranslation(option: MultipleChoiceOption): string {
        return this.Question.determineOptionDescriptionTranslation(option.claimChoiceType as string);
    }

    getOptionClass(option: MultipleChoiceOption) {
        return this.Question.determineClaimChoiceOptionClass(option.claimChoiceType as string);
    }

    updateOptionText(opt: MultipleChoiceOption, event: Event, index: number) {
        const textarea = event.target as HTMLTextAreaElement;
        const questionValue = this.question();
        questionValue.options[index].option = textarea.value;
    }

    updateOptionScore(opt: MultipleChoiceOption, event: Event, index: number) {
        const inputElement = event.target as HTMLInputElement;
        const score = parseFloat(inputElement.value);
        const questionValue = this.question();

        questionValue.options[index].defaultScore = score;
        if (score <= 0) {
            questionValue.options[index].correctOption = false;
            questionValue.options[index].claimChoiceType = 'IncorrectOption';
        } else {
            questionValue.options[index].correctOption = true;
            questionValue.options[index].claimChoiceType = 'CorrectOption';
        }

        const missingOptionValue = this.Question.getInvalidClaimOptionTypes(questionValue.options)
            .filter((type) => type !== 'SkipOption')
            .map((type) => this.Question.getOptionTypeTranslation(type))[0];
        this.missingOption.set(missingOptionValue || '');
    }
}
