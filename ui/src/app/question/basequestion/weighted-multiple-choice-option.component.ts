// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-wmc-option-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    template: `
        <div ngModelGroup="wmcOptions" class="m-0 p-0">
            <div class="row my-2">
                <div class="col-md-6 me-3 question-option-empty" [ngClass]="getOptionStyle()">
                    <textarea
                        id="optionText-{{ index() }}"
                        name="optionText-{{ index() }}"
                        type="text"
                        rows="1"
                        class="question-option-input form-control"
                        [ngModel]="option().option"
                        (ngModelChange)="setOptionText($event)"
                        required
                    ></textarea>
                </div>
                <div class="col-md-2 question-option-empty-radio" [ngClass]="getOptionStyle()">
                    <input
                        id="optionScore-{{ index() }}"
                        name="optionScore-{{ index() }}"
                        class="question-option-input points"
                        type="number"
                        step="0.01"
                        lang="en"
                        [ngModel]="option().defaultScore"
                        (ngModelChange)="setDefaultScore($event)"
                        xmFixedPrecision
                        required
                        [disabled]="lotteryOn()"
                    />
                </div>
                <button
                    class="col-md-1 question-option-trash pointer btn btn-link "
                    [hidden]="lotteryOn()"
                    (click)="removeOption()"
                >
                    <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                </button>
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    imports: [FormsModule, NgClass, FixedPrecisionValidatorDirective, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeightedMultipleChoiceOptionEditorComponent {
    option = input.required<MultipleChoiceOption>();
    index = input(0);
    question = input.required<Question | QuestionDraft>();
    lotteryOn = input(false);

    questionChange = output<Question | QuestionDraft>();

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    setOptionText(value: string) {
        const optionValue = this.option();
        optionValue.option = value;
    }

    setDefaultScore(value: number) {
        const optionValue = this.option();
        optionValue.defaultScore = value;
    }

    removeOption() {
        const optionValue = this.option();
        const questionValue = this.question();
        const hasCorrectAnswer = questionValue.options.some((o) => o !== optionValue && o.defaultScore > 0);
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

    getOptionStyle() {
        const optionValue = this.option();
        if (optionValue.defaultScore > 0) return 'question-correct-option';
        else if (optionValue.defaultScore < 0) return 'question-incorrect-option';
        else return '';
    }
}
