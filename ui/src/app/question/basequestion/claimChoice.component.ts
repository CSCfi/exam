/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { QuestionDraft, QuestionService } from '../question.service';

import type { MultipleChoiceOption, Question } from '../../exam/exam.model';

@Component({
    selector: 'claim-choice-editor',
    template: `
        <div>
            <div class="col-md-9 col-md-offset-3">
                <p>{{ 'sitnet_claim_choice_question_instruction' | translate }}</p>
                <p>{{ 'sitnet_claim_choice_options_description' | translate }}</p>
                <ul>
                    <li>{{ 'sitnet_claim_choice_correct_points_description' | translate }}</li>
                    <li>{{ 'sitnet_claim_choice_incorrect_points_description' | translate }}</li>
                    <li>{{ 'sitnet_claim_choice_skip_option_description' | translate }}</li>
                </ul>
                <br />
                <span>
                    <i *ngIf="showWarning" class="bi-exclamation-circle reddish"></i>
                    <small *ngIf="showWarning">{{ 'sitnet_shared_question_property_info' | translate }}</small>
                </span>
            </div>
            <div class="col-md-9 col-md-offset-3 margin-10 padl0 padr0 claim-choice-option-labels">
                <div class="claim-choice-option-label">
                    <span class="question-option-title">{{ 'sitnet_question_options' | translate | uppercase }}</span>
                </div>
                <div class="claim-choice-option-label points">
                    <span class="question-option-title">
                        {{ 'sitnet_word_points' | translate | uppercase }}
                    </span>
                </div>
            </div>
            <div class="col-md-9 col-md-offset-3 margin-10 padl0 padr0">
                <div
                    class="form-horizontal question-editor-claim-choice-option"
                    [ngClass]="returnOptionClass(opt)"
                    *ngFor="let opt of question.options"
                >
                    <div class="claim-choice-option-inputs">
                        <input
                            id="optionText"
                            [(ngModel)]="opt.option"
                            type="text"
                            class="question-option-input"
                            required
                            (change)="updateOptionTypes()"
                            [disabled]="lotteryOn || opt.claimChoiceType === 'SkipOption'"
                        />
                        <input
                            id="optionScore"
                            name="maxScore"
                            class="question-option-input points"
                            type="number"
                            lang="en"
                            fixedPrecision
                            [(ngModel)]="opt.defaultScore"
                            required
                            (change)="updateOptionTypes()"
                            [disabled]="lotteryOn || opt.claimChoiceType === 'SkipOption'"
                        />
                    </div>
                    <div class="claim-choice-option-description">
                        {{ returnOptionDescriptionTranslation(opt) | translate }}
                    </div>
                </div>
            </div>
            <div class="col-md-9 col-md-offset-3 claim-choice-warning-wrapper">
                <div class="claim-choice-warning" *ngIf="missingOptions.length > 0">
                    <i class="bi-exclamation-triangle" style="color:#E8172F;"></i>
                    <span style="color:#E8172F;">
                        {{ 'sitnet_claim_choice_missing_options_warning' | translate }}
                        <span>{{ displayMissingOptions() }}</span>
                    </span>
                </div>
            </div>
        </div>
    `,
})
export class ClaimChoiceEditorComponent {
    @Input() option!: MultipleChoiceOption;
    @Input() question!: Question | QuestionDraft;
    @Input() lotteryOn = false;
    @Input() showWarning = false;

    missingOptions: string[] = [];

    defaultOptions = {
        correct: {
            option: this.translate.instant('sitnet_claim_choice_default_correct'),
            defaultScore: 1,
            correctOption: true,
            claimChoiceType: 'CorrectOption',
        },
        wrong: {
            option: this.translate.instant('sitnet_claim_choice_default_incorrect'),
            defaultScore: -1,
            correctOption: false,
            claimChoiceType: 'IncorrectOption',
        },
        skip: {
            option: this.translate.instant('sitnet_question_claim_skip'),
            defaultScore: 0,
            correctOption: false,
            claimChoiceType: 'SkipOption',
        },
    };

    constructor(private translate: TranslateService, private Question: QuestionService) {}

    ngOnInit() {
        const { state, question } = this.question;
        if (state === 'NEW' && question === '') {
            this.resetOptions();
        }
    }

    displayMissingOptions = () => this.missingOptions.map(this.translate.instant).join();

    private resetOptions = () => {
        const { correct, wrong, skip } = this.defaultOptions;
        this.question.options = [correct, wrong, skip];
    };

    returnOptionDescriptionTranslation = (option: MultipleChoiceOption): string =>
        this.Question.returnOptionDescriptionTranslation(option.claimChoiceType as string);

    returnOptionClass = (option: MultipleChoiceOption) =>
        this.Question.returnClaimChoiceOptionClass(option.claimChoiceType as string);

    private validate = () =>
        (this.missingOptions = this.Question.getInvalidClaimOptionTypes(this.question.options)
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.Question.getOptionTypeTranslation(optionType)));

    updateOptionTypes = () => {
        this.question.options.forEach((opt, index) => {
            if (opt.claimChoiceType === 'SkipOption') {
                return opt;
            }
            if (opt.defaultScore === undefined) {
                this.question.options[index].correctOption = false;
                delete this.question.options[index].claimChoiceType;
            }
            if (opt.defaultScore <= 0) {
                this.question.options[index].correctOption = false;
                this.question.options[index].claimChoiceType = 'IncorrectOption';
            } else if (opt.defaultScore > 0) {
                this.question.options[index].correctOption = true;
                this.question.options[index].claimChoiceType = 'CorrectOption';
            }
        });
        this.validate();
    };
}
