// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { MultipleChoiceOptionEditorComponent } from './multiple-choice-option.component';
import { WeightedMultipleChoiceOptionEditorComponent } from './weighted-multiple-choice-option.component';

@Component({
    selector: 'xm-multiple-choice-editor',
    template: `
        @if (question.type === 'WeightedMultipleChoiceQuestion') {
            <div class="row mt-2">
                <div class="col-md-6">
                    <span class="question-option-title">{{ 'i18n_option' | translate }}</span>
                    <br /><span>
                        @if (showWarning) {
                            <div class="edit-warning-container">
                                <i class="bi-exclamation-circle text-danger"></i>
                                <small class="ps-2">{{
                                    'i18n_shared_question_property_info_multi_choice' | translate
                                }}</small>
                            </div>
                        }
                    </span>
                </div>
                <div class="col-md-6 question-option-title">
                    {{ 'i18n_word_points' | translate | uppercase }}
                </div>
            </div>
        }
        @if (question.type === 'MultipleChoiceQuestion') {
            <div class="row mt-2">
                <div class="col-md-6">
                    <span class="question-option-title">{{ 'i18n_option' | translate }}</span>
                    <br /><span>
                        @if (showWarning) {
                            <div class="edit-warning-container">
                                <i class="bi-exclamation-circle text-danger"></i>
                                <small class="ps-2">{{
                                    'i18n_shared_question_property_info_multi_choice' | translate
                                }}</small>
                            </div>
                        }
                    </span>
                </div>
                <div class="col-md-6">
                    <div class="question-option-title make-inline">
                        {{ 'i18n_multiplechoice_question_correct' | translate | uppercase }}
                    </div>
                </div>
            </div>
        }
        @for (option of question.options; track option.id; let i = $index) {
            <div class="row">
                <div class="col-md-12">
                    @if (question.type === 'MultipleChoiceQuestion') {
                        <xm-mc-option-editor
                            [option]="option"
                            [question]="question"
                            [index]="i"
                            [allowRemoval]="!lotteryOn && allowOptionRemoval"
                        >
                        </xm-mc-option-editor>
                    }
                    @if (question.type === 'WeightedMultipleChoiceQuestion') {
                        <xm-wmc-option-editor
                            [option]="option"
                            [index]="i"
                            [question]="question"
                            [lotteryOn]="lotteryOn"
                        ></xm-wmc-option-editor>
                    }
                </div>
            </div>
        }
        @if (question.type === 'WeightedMultipleChoiceQuestion') {
            <div class="row mt-3">
                <div class="col-md-12 question-option-title">
                    {{ 'i18n_max_score' | translate | uppercase }}:
                    {{ calculateDefaultMaxPoints() }}
                </div>
            </div>
        }
        <div class="row mt-3">
            <div class="col-md-12">
                <a (click)="addNewOption()" class="attachment-link pointer">
                    <i class="bi-plus"></i>
                    {{ 'i18n_question_add_new_option' | translate }}
                </a>
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    standalone: true,
    imports: [
        MultipleChoiceOptionEditorComponent,
        WeightedMultipleChoiceOptionEditorComponent,
        UpperCasePipe,
        TranslateModule,
    ],
})
export class MultipleChoiceEditorComponent implements OnInit {
    @Input() question!: Question | QuestionDraft;
    @Input() showWarning = false;
    @Input() lotteryOn = false;
    @Input() allowOptionRemoval = false;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private QuestionScore: QuestionScoringService,
    ) {}

    ngOnInit() {
        if (this.question.type === 'WeightedMultipleChoiceQuestion') {
            delete this.question.defaultMaxScore;
        }
    }
    addNewOption = () => {
        if (this.lotteryOn) {
            this.toast.error(this.translate.instant('i18n_action_disabled_lottery_on'));
            return;
        }
        const option: MultipleChoiceOption = {
            option: '',
            correctOption: false,
            defaultScore: 0,
        };
        this.question.options.push(option);
    };

    calculateDefaultMaxPoints = () => this.QuestionScore.calculateDefaultMaxPoints(this.question as Question);
}
