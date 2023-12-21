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
import { NgClass, NgFor, NgIf, UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { MultipleChoiceOption, Question } from '../../exam/exam.model';
import { FixedPrecisionValidatorDirective } from '../../shared/validation/fixed-precision.directive';
import { QuestionDraft, QuestionService } from '../question.service';

@Component({
    selector: 'xm-claim-choice-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    template: `
        <div ngModelGroup="claimChoice" name="claimChoice">
            <div class="col-md-9 col-md-offset-3">
                <p>{{ 'i18n_claim_choice_question_instruction' | translate }}</p>
                <p>{{ 'i18n_claim_choice_options_description' | translate }}</p>
                <ul>
                    <li>{{ 'i18n_claim_choice_correct_points_description' | translate }}</li>
                    <li>{{ 'i18n_claim_choice_incorrect_points_description' | translate }}</li>
                    <li>{{ 'i18n_claim_choice_skip_option_description' | translate }}</li>
                </ul>
                <br />
                <div class="edit-warning-container" *ngIf="showWarning">
                    <i class="bi-exclamation-circle reddish me-2"></i>
                    <small>{{ 'i18n_shared_question_property_info' | translate }}</small>
                </div>
            </div>
            <div class="col-md-9 col-md-offset-3 margin-10 padl0 padr0 claim-choice-option-labels">
                <div class="claim-choice-option-label">
                    <span class="question-option-title">{{ 'i18n_question_options' | translate | uppercase }}</span>
                </div>
                <div class="claim-choice-option-label points">
                    <span class="question-option-title">
                        {{ 'i18n_word_points' | translate | uppercase }}
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
                        <textarea
                            name="{{ opt.claimChoiceType }}-question"
                            [(ngModel)]="opt.option"
                            type="text"
                            rows="1"
                            class="question-option-input form-control"
                            required
                            (change)="updateOptionTypes()"
                            [disabled]="lotteryOn || opt.claimChoiceType === 'SkipOption'"
                        ></textarea>
                        <input
                            name="{{ opt.claimChoiceType }}-score"
                            class="question-option-input points"
                            type="number"
                            lang="en"
                            xmFixedPrecision
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
                        {{ 'i18n_claim_choice_missing_options_warning' | translate }}
                        <span>{{ displayMissingOptions() }}</span>
                    </span>
                </div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [FormsModule, NgIf, NgFor, NgClass, FixedPrecisionValidatorDirective, UpperCasePipe, TranslateModule],
})
export class ClaimChoiceEditorComponent implements OnInit {
    @Input() option!: MultipleChoiceOption;
    @Input() question!: Question | QuestionDraft;
    @Input() lotteryOn = false;
    @Input() showWarning = false;

    missingOptions: string[] = [];

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

    constructor(private translate: TranslateService, private Question: QuestionService) {}

    ngOnInit() {
        const { state, question } = this.question;
        if (state === 'NEW' && question === '') {
            this.resetOptions();
        }
    }

    displayMissingOptions = () => this.missingOptions.map(this.translate.instant).join();

    returnOptionDescriptionTranslation = (option: MultipleChoiceOption): string =>
        this.Question.returnOptionDescriptionTranslation(option.claimChoiceType as string);

    returnOptionClass = (option: MultipleChoiceOption) =>
        this.Question.returnClaimChoiceOptionClass(option.claimChoiceType as string);

    updateOptionTypes = () => {
        this.question.options.forEach((opt, index) => {
            if (opt.claimChoiceType === 'SkipOption') {
                return;
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

    private resetOptions = () => {
        const { correct, wrong, skip } = this.defaultOptions;
        this.question.options = [correct, wrong, skip];
    };

    private validate = () =>
        (this.missingOptions = this.Question.getInvalidClaimOptionTypes(this.question.options)
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.Question.getOptionTypeTranslation(optionType)));
}
