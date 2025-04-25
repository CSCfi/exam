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
    template: `
        <div ngModelGroup="claimChoice" name="claimChoice">
            <div class="row">
                <div class="col-md-9 col-md-offset-3">
                    <p>{{ 'i18n_claim_choice_question_instruction' | translate }}</p>
                    <p>{{ 'i18n_claim_choice_options_description' | translate }}</p>
                    <ul>
                        <li>{{ 'i18n_claim_choice_correct_points_description' | translate }}</li>
                        <li>{{ 'i18n_claim_choice_incorrect_points_description' | translate }}</li>
                        <li>{{ 'i18n_claim_choice_skip_option_description' | translate }}</li>
                    </ul>
                    <br />
                    @if (showWarning) {
                        <div class="edit-warning-container">
                            <i class="bi-exclamation-circle text-danger me-2"></i>
                            <small>{{ 'i18n_shared_question_property_info' | translate }}</small>
                        </div>
                    }
                </div>
            </div>
            <div class="row ms-2 w-50 px-3 pb-2">
                <div class="col-9">
                    <span class="question-option-title">{{ 'i18n_question_options' | translate | uppercase }}</span>
                </div>
                <div class="col ms-1">
                    <span class="question-option-title">
                        {{ 'i18n_word_points' | translate | uppercase }}
                    </span>
                </div>
            </div>
            @for (opt of question.options; track opt.id; let index = $index) {
                <div class="row ms-2 w-50 question-editor-claim-choice-option" [ngClass]="getOptionClass(opt)">
                    <div class="col-9">
                        <textarea
                            name="{{ opt.claimChoiceType }}-question"
                            [value]="opt.option"
                            (input)="updateOptionText(opt, $event, index)"
                            type="text"
                            rows="1"
                            class="question-option-input form-control"
                            required
                            [disabled]="lotteryOn || opt.claimChoiceType === 'SkipOption'"
                        ></textarea>
                    </div>
                    <div class="col">
                        <input
                            name="{{ opt.claimChoiceType }}-score"
                            class="question-option-input points"
                            type="number"
                            lang="en"
                            xmFixedPrecision
                            [value]="opt.defaultScore"
                            (input)="updateOptionScore(opt, $event, index)"
                            required
                            [disabled]="lotteryOn || opt.claimChoiceType === 'SkipOption'"
                        />
                    </div>
                    <div class="claim-choice-option-description m-2">
                        {{ getOptionDescriptionTranslation(opt) | translate }}
                    </div>
                </div>
            }
        </div>
        <div class="row">
            <div class="col-md-9 col-md-offset-3 claim-choice-warning-wrapper">
                @if (missingOption) {
                    <div class="claim-choice-warning">
                        <i class="bi-exclamation-triangle" style="color:#E8172F;"></i>
                        <span style="color:#E8172F;">
                            {{ 'i18n_claim_choice_missing_options_warning' | translate }}
                            <span>{{ missingOption | translate }}</span>
                        </span>
                    </div>
                }
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    standalone: true,
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
