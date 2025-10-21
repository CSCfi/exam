// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { MultipleChoiceOption, Question, QuestionDraft } from 'src/app/question/question.model';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-wmc-option-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    template: `
        <div ngModelGroup="wmcOptions" class="m-0 p-0 exclude">
            <div class="row">
                <div
                    class="col-md-6 question-option-empty"
                    [ngClass]="option.defaultScore > 0 ? 'question-correct-option' : ''"
                >
                    <textarea
                        id="optionText-{{ index }}"
                        name="optionText-{{ index }}"
                        type="text"
                        rows="1"
                        class="question-option-input form-control"
                        [(ngModel)]="option.option"
                        required
                    ></textarea>
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
                        step="0.01"
                        lang="en"
                        [(ngModel)]="option.defaultScore"
                        xmFixedPrecision
                        required
                        [disabled]="lotteryOn"
                    />
                </div>
                <button
                    class="col-md-1 question-option-trash pointer btn btn-link "
                    [hidden]="lotteryOn"
                    (click)="removeOption()"
                >
                    <i class="bi-trash" title="{{ 'i18n_remove' | translate }}"></i>
                </button>
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    imports: [FormsModule, NgClass, FixedPrecisionValidatorDirective, TranslateModule],
})
export class WeightedMultipleChoiceOptionEditorComponent {
    @Input() option!: MultipleChoiceOption;
    @Input() index = 0;
    @Input() question!: Question | QuestionDraft;
    @Input() lotteryOn = false;

    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    removeOption = () => {
        const hasCorrectAnswer = this.question.options.some((o) => o !== this.option && o.defaultScore > 0);
        if (hasCorrectAnswer) {
            this.question.options.splice(this.question.options.indexOf(this.option), 1);
        } else {
            this.toast.error(this.translate.instant('i18n_action_disabled_minimum_options'));
        }
    };
}
