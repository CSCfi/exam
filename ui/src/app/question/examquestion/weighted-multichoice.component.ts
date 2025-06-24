// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, UpperCasePipe } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion, ExamSectionQuestionOption } from 'src/app/question/question.model';

@Component({
    selector: 'xm-eq-weighted-mc',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    standalone: true,
    imports: [FormsModule, NgClass, NgbPopoverModule, TranslateModule, UpperCasePipe],
    styleUrls: ['../question.shared.scss'],
    template: `
        <div ngModelGroup="weightedMcq" id="weightedMcq">
            <div class="row mt-2">
                <div class="col-md-6 col-sm-12">
                    {{ 'i18n_weighted_multiple_choice_description' | translate }}
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-12">
                    <div class="form-check">
                        <input
                            class="form-check-input"
                            name="negativeScore"
                            type="checkbox"
                            [(ngModel)]="question().negativeScoreAllowed"
                            (ngModelChange)="updateNegativeScoreSetting($event)"
                            id="negativeScore"
                        />
                        <label class="form-check-label" for="negativeScore">{{
                            'i18n_allow_negative_score' | translate
                        }}</label>
                    </div>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-12">
                    <div class="form-check">
                        <input
                            class="form-check-input"
                            name="optionShuffling"
                            type="checkbox"
                            [(ngModel)]="question().optionShufflingOn"
                            id="optionShuffling"
                        />
                        <label class="form-check-label" for="optionShuffling">{{
                            'i18n_shuffle_options' | translate
                        }}</label>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-6">
                    <span class="question-option-title">{{ 'i18n_option' | translate }}</span>
                </div>
                <div class="col question-option-title">
                    {{ 'i18n_word_points' | translate | uppercase }}
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    @for (option of question().options; track option; let index = $index) {
                        <div class="row form-horizontal m-0 p-0 mb-3">
                            @if (option.option) {
                                <div
                                    class="col-md-6 question-option-empty"
                                    [ngClass]="
                                        option.score > 0
                                            ? 'question-correct-option'
                                            : option.score < 0
                                              ? 'question-incorrect-option'
                                              : ''
                                    "
                                >
                                    <textarea
                                        id="weightedOptionText_{{ option.id }}"
                                        type="text"
                                        rows="1"
                                        name="weightedOptionText_{{ option.id }}"
                                        class="question-option-input form-control mb-1"
                                        [ngModel]="option.option!.option"
                                        (ngModelChange)="updateText($event, index)"
                                        required
                                    ></textarea>
                                </div>
                            }
                            <div
                                class="col-md-2 question-option-empty-radio"
                                [ngClass]="
                                    option.score > 0
                                        ? 'question-correct-option-radio'
                                        : option.score < 0
                                          ? 'question-incorrect-option-radio'
                                          : ''
                                "
                            >
                                <input
                                    xmFixedPrecision
                                    id="optionScore_{{ option.id }}"
                                    name="maxScore_{{ option.id }}"
                                    class="question-option-input points"
                                    type="number"
                                    lang="en"
                                    [ngModel]="option.score"
                                    (ngModelChange)="updateScore($event, index)"
                                    required
                                    [disabled]="lotteryOn()"
                                />
                            </div>
                            <button
                                class="col-md-1 question-option-trash pointer btn btn-link"
                                [hidden]="lotteryOn()"
                                (click)="removeOption(option)"
                            >
                                <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                            </button>
                        </div>
                    }
                    <div class="row">
                        <div class="col-md-12 question-option-title">
                            {{ 'i18n_max_score' | translate | uppercase }}:
                            {{ maxScore() }}
                            {{ 'i18n_min_score' | translate | uppercase }}:
                            {{ minScore() }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-12">
                <button (click)="addNewOption()" class="attachment-link pointer btn btn-sm btn-link">
                    <i class="bi-plus"></i>
                    {{ 'i18n_question_add_new_option' | translate }}
                </button>
            </div>
        </div>
    `,
})
export class WeightedMultiChoiceComponent {
    question = model.required<ExamSectionQuestion>();
    lotteryOn = input(false);
    isInPublishedExam = input(false);
    optionsChanged = output<ExamSectionQuestionOption[]>();
    negativeScoreSettingChanged = output<boolean>();
    maxScore = computed<number>(() => this.QuestionScore.calculateWeightedMaxPoints(this.question()));
    minScore = computed<number>(() => this.QuestionScore.calculateWeightedMinPoints(this.question()));

    constructor(
        private TranslateService: TranslateService,
        private ToastrService: ToastrService,
        private QuestionScore: QuestionScoringService,
    ) {}

    updateScore = (score: number, index: number) => {
        const newOption = { ...this.question().options[index], score: score };
        const next = this.question().options;
        next[index] = newOption;
        this.optionsChanged.emit(next);
        this.question.update((q) => ({ ...q, options: next }));
    };

    updateText = (text: string, index: number) => {
        const newOption = { ...this.question().options[index].option, option: text };
        const next = this.question().options;
        next[index].option = newOption;
        this.optionsChanged.emit(next);
    };

    updateNegativeScoreSetting = (setting: boolean) => {
        this.negativeScoreSettingChanged.emit(setting);
        this.question.update((q) => ({ ...q, negativeScoreAllowed: setting }));
    };

    addNewOption = () => {
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const newOption: ExamSectionQuestionOption = {
            id: undefined,
            option: {
                correctOption: false,
                option: '',
                defaultScore: 0,
            },
            score: 0,
            answered: false,
        };
        this.optionsChanged.emit([...this.question().options, newOption]);
    };

    removeOption = (option: ExamSectionQuestionOption) => {
        if (this.lotteryOn()) {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_lottery_on'));
            return;
        }

        const hasCorrectAnswer =
            this.question().options.filter(
                (o) =>
                    o.id !== option.id &&
                    (o.option?.correctOption || (o.option?.defaultScore && o.option.defaultScore > 0)),
            ).length > 0;

        // Either not published exam or correct answer exists
        if (!this.isInPublishedExam() || hasCorrectAnswer) {
            this.optionsChanged.emit(this.question().options.filter((o) => o.id !== option.id));
        } else {
            this.ToastrService.error(this.TranslateService.instant('i18n_action_disabled_minimum_options'));
        }
    };
}
