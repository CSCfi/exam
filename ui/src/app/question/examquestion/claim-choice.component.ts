// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestionOption } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';

@Component({
    selector: 'xm-eq-claim-choice',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    standalone: true,
    imports: [FormsModule, NgClass, NgbPopoverModule, TranslateModule, UpperCasePipe],
    styleUrls: ['../question.shared.scss'],
    template: `
        <div ngModelGroup="claimChoice" id="claimChoice">
            <div class="row">
                <div class="col-md-12">
                    <p>{{ 'i18n_claim_choice_question_instruction' | translate }}</p>
                    <p>{{ 'i18n_claim_choice_options_description' | translate }}</p>
                    <ul>
                        <li>{{ 'i18n_claim_choice_correct_points_description' | translate }}</li>
                        <li>{{ 'i18n_claim_choice_incorrect_points_description' | translate }}</li>
                        <li>{{ 'i18n_claim_choice_skip_option_description' | translate }}</li>
                    </ul>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12 m-1 claim-choice-option-labels">
                    <div class="claim-choice-option-label">
                        <span class="question-option-title">{{ 'i18n_question_options' | translate | uppercase }}</span>
                    </div>
                    <div class="claim-choice-option-label points">
                        <span class="question-option-title">
                            {{ 'i18n_word_points' | translate | uppercase }}
                        </span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12 m-1">
                    @for (opt of options(); track opt.id; let index = $index) {
                        <div class="question-editor-claim-choice-option row" [ngClass]="getOptionClass(opt)">
                            @if (opt.option) {
                                <div class="claim-choice-option-inputs col-md-9">
                                    <textarea
                                        [ngModel]="opt.option!.option"
                                        (ngModelChange)="updateText($event, index)"
                                        name="claimChoiceOption_{{ opt.id }}"
                                        type="text"
                                        rows="1"
                                        class="make-inline form-control"
                                        required
                                        [disabled]="lotteryOn() || opt.option?.claimChoiceType === 'SkipOption'"
                                    ></textarea>
                                </div>
                            }
                            <div class="col-md-2">
                                <input
                                    name="claimChoiceOptionScore_{{ opt.id }}"
                                    class="question-option-input points"
                                    type="number"
                                    lang="en"
                                    xmFixedPrecision
                                    [ngModel]="opt.score"
                                    (ngModelChange)="updateScore($event, index)"
                                    required
                                    [disabled]="lotteryOn() || opt.option!.claimChoiceType === 'SkipOption'"
                                />
                            </div>
                            <div class="claim-choice-option-description">
                                {{ translateDescription(opt) }}
                            </div>
                        </div>
                    }
                </div>
            </div>
            <div class="row">
                <div class="col-md-12 claim-choice-warning-wrapper">
                    @if (missingOptions().length > 0) {
                        <div class="claim-choice-warning">
                            <i class="bi-exclamation-triangle" style="color: #e8172f"></i>
                            <span style="color: #e8172f">
                                {{ 'i18n_claim_choice_missing_options_warning' | translate }}
                                @for (opt of missingOptions(); track $index; let l = $last) {
                                    <span> {{ opt | translate }}{{ l ? '' : ',' }} </span>
                                }
                            </span>
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
})
export class ClaimChoiceComponent {
    options = input<ExamSectionQuestionOption[]>([]);
    lotteryOn = input(false);
    optionsChanged = output<ExamSectionQuestionOption[]>();

    missingOptions = computed<string[]>(() =>
        this.QuestionService.getInvalidDistributedClaimOptionTypes(this.options())
            .filter((type) => type !== 'SkipOption')
            .map((optionType) => this.QuestionService.getOptionTypeTranslation(optionType)),
    );

    constructor(private QuestionService: QuestionService) {}

    updateText = (text: string, index: number) => {
        const newOption = { ...this.options()[index].option, option: text };
        const next = this.options();
        next[index].option = newOption;
        this.optionsChanged.emit(next);
    };

    updateScore = (score: number, index: number) => {
        const newOption = { ...this.options()[index], score: score };
        const next = this.options();
        next[index] = newOption;
        this.optionsChanged.emit(next);
    };

    determineOptionType = (option: ExamSectionQuestionOption) =>
        this.QuestionService.determineClaimOptionTypeForExamQuestionOption(option);

    translateDescription = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineOptionDescriptionTranslation(optionType);
    };

    getOptionClass = (option: ExamSectionQuestionOption) => {
        const optionType = this.determineOptionType(option);
        if (!optionType) {
            return '';
        }
        return this.QuestionService.determineClaimChoiceOptionClass(optionType);
    };
}
