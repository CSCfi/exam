// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
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
})
export class ClaimChoiceEditorComponent implements OnInit {
    @Input() question!: Question | QuestionDraft;
    @Input() lotteryOn = false;
    @Input() showWarning = false;

    missingOption: string = '';
    defaultOptions = {
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

    constructor(
        private translate: TranslateService,
        private Question: QuestionService,
    ) {}

    ngOnInit() {
        const { state, question } = this.question;
        if (state === 'NEW' && question === '') {
            const { correct, wrong, skip } = this.defaultOptions;
            this.question.options = [correct, wrong, skip];
        }
    }

    getOptionDescriptionTranslation = (option: MultipleChoiceOption): string =>
        this.Question.determineOptionDescriptionTranslation(option.claimChoiceType as string);

    getOptionClass = (option: MultipleChoiceOption) =>
        this.Question.determineClaimChoiceOptionClass(option.claimChoiceType as string);

    updateOptionText = (opt: MultipleChoiceOption, event: Event, index: number) => {
        const textarea = event.target as HTMLTextAreaElement;
        this.question.options[index].option = textarea.value;
    };

    updateOptionScore = (opt: MultipleChoiceOption, event: Event, index: number) => {
        const input = event.target as HTMLInputElement;
        const score = parseFloat(input.value);

        this.question.options[index].defaultScore = score;
        if (score <= 0) {
            this.question.options[index].correctOption = false;
            this.question.options[index].claimChoiceType = 'IncorrectOption';
        } else {
            this.question.options[index].correctOption = true;
            this.question.options[index].claimChoiceType = 'CorrectOption';
        }

        this.missingOption = this.Question.getInvalidClaimOptionTypes(this.question.options)
            .filter((type) => type !== 'SkipOption')
            .map((type) => this.Question.getOptionTypeTranslation(type))[0];
    };
}
