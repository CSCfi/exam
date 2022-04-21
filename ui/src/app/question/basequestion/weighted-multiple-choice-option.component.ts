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
import { ToastrService } from 'ngx-toastr';
import type { MultipleChoiceOption, Question } from '../../exam/exam.model';
import { QuestionDraft } from '../question.service';

@Component({
    selector: 'wmc-option-editor',
    template: `
        <div class="question-editor-option">
            <div class="row">
                <div
                    class="col-md-6 question-option-empty"
                    [ngClass]="option.defaultScore > 0 ? 'question-correct-option' : ''"
                >
                    <input
                        id="optionText-{{ index }}"
                        name="optionText-{{ index }}"
                        type="text"
                        class="question-option-input"
                        [(ngModel)]="option.option"
                        required
                    />
                </div>
                <div
                    class="col-md-2 question-option-empty-radio"
                    [ngClass]="option.defaultScore > 0 ? 'question-correct-option-radio' : ''"
                >
                    <input
                        id="optionScore-{{ index }}"
                        name="optionScore-{{ index }}"
                        class="question-option-input points"
                        type="number"
                        lang="en"
                        [(ngModel)]="option.defaultScore"
                        fixedPrecision
                        required
                        [disabled]="lotteryOn"
                    />
                </div>
                <div class="col-md-1 question-option-trash pointer" [hidden]="lotteryOn" (click)="removeOption()">
                    <i class="bi-trash" title="{{ 'sitnet_remove' | translate }}"></i>
                </div>
            </div>
        </div>
    `,
})
export class WeightedMultipleChoiceOptionEditorComponent {
    @Input() option!: MultipleChoiceOption;
    @Input() index = 0;
    @Input() question!: Question | QuestionDraft;
    @Input() lotteryOn = false;

    constructor(private translate: TranslateService, private toast: ToastrService) {}

    removeOption = () => {
        const hasCorrectAnswer = this.question.options.some((o) => o !== this.option && o.defaultScore > 0);
        if (hasCorrectAnswer) {
            this.question.options.splice(this.question.options.indexOf(this.option), 1);
        } else {
            this.toast.error(this.translate.instant('sitnet_action_disabled_minimum_options'));
        }
    };
}
