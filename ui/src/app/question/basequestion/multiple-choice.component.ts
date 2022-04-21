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
import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { MultipleChoiceOption, Question } from '../../exam/exam.model';
import { QuestionDraft, QuestionService } from '../question.service';

@Component({
    selector: 'xm-multiple-choice-editor',
    template: `
        <div class="row mt-2" *ngIf="question.type === 'WeightedMultipleChoiceQuestion'">
            <div class="col-md-6">
                <span class="question-option-title">{{ 'sitnet_option' | translate }}</span>
                <br /><span>
                    <i *ngIf="showWarning" class="bi-exclamation-circle reddish"></i>
                    <small class="pl-2" *ngIf="showWarning">{{
                        'sitnet_shared_question_property_info' | translate
                    }}</small>
                </span>
            </div>
            <div class="col-md-6 question-option-title">
                {{ 'sitnet_word_points' | translate | uppercase }}
            </div>
        </div>
        <div class="row mt-2" *ngIf="question.type === 'MultipleChoiceQuestion'">
            <div class="col-md-6">
                <span class="question-option-title">{{ 'sitnet_option' | translate }}</span>
                <br /><span>
                    <i *ngIf="showWarning" class="bi-exclamation-circle reddish"></i>
                    <small *ngIf="showWarning">{{ 'sitnet_shared_question_property_info' | translate }}</small>
                </span>
            </div>
            <div class="col-md-6">
                <div class="question-option-title make-inline">
                    {{ 'sitnet_multiplechoice_question_correct' | translate | uppercase }}
                </div>
            </div>
        </div>
        <div class="row" id="question-editor" *ngFor="let option of question.options; let i = index">
            <div class="col-md-12">
                <xm-mc-option-editor
                    *ngIf="question.type === 'MultipleChoiceQuestion'"
                    [option]="option"
                    [question]="question"
                    [index]="i"
                    [allowRemoval]="!lotteryOn && allowOptionRemoval"
                >
                </xm-mc-option-editor>
                <xm-wmc-option-editor
                    *ngIf="question.type === 'WeightedMultipleChoiceQuestion'"
                    [option]="option"
                    [index]="i"
                    [question]="question"
                    [lotteryOn]="lotteryOn"
                ></xm-wmc-option-editor>
            </div>
        </div>
        <div *ngIf="question.type === 'WeightedMultipleChoiceQuestion'" class="row mt-3">
            <div class="col-md-12 question-option-title">
                {{ 'sitnet_max_score' | translate | uppercase }}:
                {{ calculateDefaultMaxPoints() }}
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-12">
                <a (click)="addNewOption()" class="attachment-link pointer">
                    <i class="bi-plus"></i>
                    {{ 'sitnet_question_add_new_option' | translate }}
                </a>
            </div>
        </div>
    `,
})
export class MultipleChoiceEditorComponent implements OnInit {
    @Input() question!: Question | QuestionDraft;
    @Input() showWarning = false;
    @Input() lotteryOn = false;
    @Input() allowOptionRemoval = false;

    constructor(private translate: TranslateService, private toast: ToastrService, private Question: QuestionService) {}

    ngOnInit() {
        if (this.question.type === 'WeightedMultipleChoiceQuestion') {
            delete this.question.defaultMaxScore;
        }
    }
    addNewOption = () => {
        if (this.lotteryOn) {
            this.toast.error(this.translate.instant('sitnet_action_disabled_lottery_on'));
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
