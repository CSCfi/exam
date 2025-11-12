// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
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
                    [ngClass]="{ 'question-correct-option': option().correctOption }"
                >
                    <textarea
                        type="text"
                        rows="1"
                        name="option-{{ index() }}"
                        class="make-inline question-option-input radiobut form-control"
                        [ngModel]="option().option"
                        (ngModelChange)="setOptionText($event)"
                        required
                    ></textarea>
                </div>
                <div
                    class="col-md-2 question-option-empty-radio"
                    [ngClass]="{ 'question-correct-option-radio': option().correctOption }"
                >
                    <input
                        name="correctOption-{{ index() }}"
                        type="radio"
                        [ngModel]="option().correctOption"
                        (ngModelChange)="setCorrectOption($event)"
                        [value]="true"
                        (change)="correctAnswerToggled()"
                        [disabled]="option().correctOption"
                        class="make-inline question-option-radio"
                    />
                </div>

                @if (allowRemoval()) {
                    <button (click)="removeOption()" class="col-md-1 question-option-trash btn btn-link">
                        <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                    </button>
                }
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    imports: [FormsModule, NgClass, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceOptionEditorComponent {
    option = input.required<MultipleChoiceOption>();
    index = input(0);
    question = input.required<Question | QuestionDraft>();
    allowRemoval = input(false);

    questionChange = output<Question | QuestionDraft>();

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Question = inject(QuestionService);

    setOptionText(value: string) {
        const optionValue = this.option();
        optionValue.option = value;
    }

    setCorrectOption(value: boolean) {
        const optionValue = this.option();
        optionValue.correctOption = value;
    }

    correctAnswerToggled() {
        const optionValue = this.option();
        const questionValue = this.question();
        this.Question.toggleCorrectOption(optionValue, questionValue.options);
    }

    removeOption() {
        const optionValue = this.option();
        const questionValue = this.question();
        const hasCorrectAnswer = questionValue.options.some((o) => o !== optionValue && o.correctOption);
        if (hasCorrectAnswer) {
            const updatedQuestion = {
                ...questionValue,
                options: questionValue.options.filter((o) => o !== optionValue),
            };
            this.questionChange.emit(updatedQuestion);
        } else {
            this.toast.error(this.translate.instant('i18n_action_disabled_minimum_options'));
        }
    }
}
