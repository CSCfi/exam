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
import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { MultipleChoiceOption, Question } from '../../exam/exam.model';
import { QuestionDraft, QuestionService } from '../question.service';

@Component({
    selector: 'xm-mc-option-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    template: `
        <div ngModelGroup="mcOptions" class="m-0 p-0 exclude">
            <div class="row">
                <div
                    class="col-md-6 question-option-empty"
                    [ngClass]="{ 'question-correct-option': option.correctOption }"
                >
                    <textarea
                        type="text"
                        rows="1"
                        name="option-{{ index }}"
                        class="make-inline question-option-input radiobut form-control"
                        [(ngModel)]="option.option"
                        required
                    ></textarea>
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

                @if (allowRemoval) {
                    <div (click)="removeOption()" class="col-md-1 question-option-trash">
                        <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                    </div>
                }
            </div>
        </div>
    `,
    standalone: true,
    imports: [FormsModule, NgClass, TranslateModule],
})
export class MultipleChoiceOptionEditorComponent {
    @Input() option!: MultipleChoiceOption;
    @Input() index = 0;
    @Input() question!: Question | QuestionDraft;
    @Input() allowRemoval = false;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private Question: QuestionService,
    ) {}

    correctAnswerToggled = () => this.Question.toggleCorrectOption(this.option, this.question.options);

    removeOption = () => {
        const hasCorrectAnswer = this.question.options.some((o) => o !== this.option && o.correctOption);
        if (hasCorrectAnswer) {
            this.question.options.splice(this.question.options.indexOf(this.option), 1);
        } else {
            this.toast.error(this.translate.instant('i18n_action_disabled_minimum_options'));
        }
    };
}
