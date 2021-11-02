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

import { QuestionDraft, QuestionService } from '../question.service';

import type { MultipleChoiceOption, Question } from '../../exam/exam.model';

@Component({
    selector: 'mc-option-editor',
    template: `
        <div class="question-editor-option">
            <div class="row">
                <div
                    class="col-md-6 question-option-empty"
                    [ngClass]="{ 'question-correct-option': option.correctOption }"
                >
                    <input
                        type="text"
                        name="option-{{ index }}"
                        class="make-inline question-option-input radiobut"
                        [(ngModel)]="option.option"
                        required
                    />
                </div>
                <div
                    class="col-md-2 question-option-empty-radio"
                    [ngClass]="{ 'question-correct-option-radio': option.correctOption }"
                >
                    <input
                        name="correctOption-{{ index }}"
                        type="radio"
                        [(ngModel)]="option.correctOption"
                        [value]="true"
                        (change)="correctAnswerToggled()"
                        [disabled]="option.correctOption"
                        class="make-inline question-option-radio"
                    />
                </div>

                <div *ngIf="allowRemoval" (click)="removeOption()" class="col-md-1 question-option-trash">
                    <i class="bi-trash" title="{{ 'sitnet_remove' | translate }}"></i>
                </div>
            </div>
        </div>
    `,
})
export class MultipleChoiceOptionEditorComponent {
    @Input() option: MultipleChoiceOption;
    @Input() index: number;
    @Input() question: Question | QuestionDraft;
    @Input() allowRemoval: boolean;

    constructor(private translate: TranslateService, private Question: QuestionService) {}

    correctAnswerToggled = () => this.Question.toggleCorrectOption(this.option, this.question.options);

    removeOption = () => {
        const hasCorrectAnswer = this.question.options.some((o) => o !== this.option && o.correctOption);
        if (hasCorrectAnswer) {
            this.question.options.splice(this.question.options.indexOf(this.option), 1);
        } else {
            toast.error(this.translate.instant('sitnet_action_disabled_minimum_options'));
        }
    };
}
