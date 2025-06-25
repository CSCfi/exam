// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';

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
                    <button (click)="removeOption()" class="col-md-1 question-option-trash btn btn-link">
                        <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                    </button>
                }
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
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
