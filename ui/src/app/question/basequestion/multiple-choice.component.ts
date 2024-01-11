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
import { UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { MultipleChoiceOption, Question } from '../../exam/exam.model';
import { QuestionDraft, QuestionService } from '../question.service';
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
                                <i class="bi-exclamation-circle reddish"></i>
                                <small class="ps-2">{{ 'i18n_shared_question_property_info' | translate }}</small>
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
                                <i class="bi-exclamation-circle reddish"></i>
                                <small class="ps-2">{{ 'i18n_shared_question_property_info' | translate }}</small>
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
            <div class="row" id="question-editor">
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
        private Question: QuestionService,
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

    calculateDefaultMaxPoints = () => this.Question.calculateDefaultMaxPoints(this.question as Question);
}
