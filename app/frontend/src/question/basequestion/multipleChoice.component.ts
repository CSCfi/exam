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
import * as toast from 'toastr';

import type { MultipleChoiceOption, Question } from '../../exam/exam.model';
import { QuestionService } from '../question.service';

@Component({
    selector: 'multiple-choice-editor',
    template: `
        <div class="col-md-12 mart20 marb10" *ngIf="question.type == 'WeightedMultipleChoiceQuestion'">
            <div class="col-md-6 padl0">
                <span class="question-option-title">{{ 'sitnet_option' | translate }}</span>
                <br /><span>
                    <i *ngIf="showWarning" class="bi-exclamation-circle reddish"></i>
                    <small *ngIf="showWarning">{{ 'sitnet_shared_question_property_info' | translate }}</small>
                </span>
            </div>
            <div class="col-md-2 question-option-title">
                {{ 'sitnet_word_points' | translate | uppercase }}
            </div>
            <div class="col-md-4"></div>
        </div>
        <div class="col-md-12 mart20 marb10" *ngIf="question.type == 'MultipleChoiceQuestion'">
            <div class="col-md-6 padl0">
                <span class="question-option-title">{{ 'sitnet_option' | translate }}</span>
                <br /><span>
                    <i *ngIf="showWarning" class="bi-exclamation-circle reddish"></i>
                    <small *ngIf="showWarning">{{ 'sitnet_shared_question_property_info' | translate }}</small>
                </span>
            </div>
            <div class="col-md-2">
                <div class="question-option-title make-inline">
                    {{ 'sitnet_multiplechoice_question_correct' | translate | uppercase }}
                </div>
            </div>
            <div class="col-md-4"></div>
        </div>
        <div id="question-editor">
            <div class="row" *ngFor="let option of question.options">
                <mc-option-editor
                    *ngIf="question.type === 'MultipleChoiceQuestion'"
                    [option]="option"
                    [question]="question"
                    [allowRemoval]="!lotteryOn && allowOptionRemoval"
                >
                </mc-option-editor>
                <wmc-option-editor
                    *ngIf="question.type === 'WeightedMultipleChoiceQuestion'"
                    [option]="option"
                    [question]="question"
                    [lotteryOn]="lotteryOn"
                ></wmc-option-editor>
            </div>
            <div *ngIf="question.type == 'WeightedMultipleChoiceQuestion'" class="row">
                <div class="col-md-6">&nbsp;</div>
                <div class="col-md-2 question-option-title">
                    {{ 'sitnet_max_score' | translate | uppercase }}:
                    {{ calculateDefaultMaxPoints() }}
                </div>
            </div>
            <div class="row mart20 padl30">
                <a (click)="addNewOption()" class="attachment-link pointer">
                    <i class="bi-plus"></i>
                    {{ 'sitnet_question_add_new_option' | translate }}
                </a>
            </div>
        </div>
    `,
})
export class MultipleChoiceEditorComponent {
    @Input() question: Omit<Question, 'options'> & { options: Partial<MultipleChoiceOption>[] };
    @Input() showWarning: boolean;
    @Input() lotteryOn: boolean;
    @Input() allowOptionRemoval: boolean;

    constructor(private translate: TranslateService, private Question: QuestionService) {}

    ngOnInit() {
        if (this.question.type === 'WeightedMultipleChoiceQuestion') {
            delete this.question.defaultMaxScore;
        }
    }
    addNewOption = () => {
        if (this.lotteryOn) {
            toast.error(this.translate.instant('sitnet_action_disabled_lottery_on'));
            return;
        }
        this.question.options.push({ correctOption: false });
    };

    calculateDefaultMaxPoints = () => this.Question.calculateDefaultMaxPoints(this.question as Question);
}
