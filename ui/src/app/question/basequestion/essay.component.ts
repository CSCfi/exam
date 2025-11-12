// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Question, QuestionDraft } from 'src/app/question/question.model';

@Component({
    selector: 'xm-essay-editor',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    template: `
        <div ngModelGroup="essay">
            <div class="row mt-3">
                <div class="col-md-3 ">
                    {{ 'i18n_essay_length_recommendation' | translate }}
                </div>
                <div class="col-md-6">
                    <div class="input-group">
                        <input
                            id="wc"
                            name="wc"
                            #wc="ngModel"
                            type="number"
                            lang="en"
                            class="form-control xm-numeric-input"
                            [ngModel]="question().defaultExpectedWordCount"
                            (ngModelChange)="setDefaultExpectedWordCount($event)"
                            [min]="1"
                            [max]="1000000"
                        />
                        <span class="input-group-text" title="{{ 'i18n_average_word_length_finnish' | translate }}">
                            {{ 'i18n_approximately' | translate }} {{ estimateCharacters() }}
                            {{ 'i18n_characters' | translate }}
                        </span>
                    </div>
                    @if (wc.invalid) {
                        <div class="warning-text-small m-2 edit-warning-container">
                            <i class="bi-exclamation-circle text-danger me-2"></i>
                            {{ 'i18n_essay_length_recommendation_bounds' | translate }}
                        </div>
                    }
                </div>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-3">
                {{ 'i18n_evaluation_type' | translate }}
            </div>
            <div class="col-md-3">
                <select
                    id="evaluationType"
                    name="evaluationType"
                    class="form-select w-75"
                    [ngModel]="question().defaultEvaluationType"
                    (ngModelChange)="updateEvaluationType($event)"
                    [disabled]="lotteryOn()"
                    [required]="question().type === 'EssayQuestion'"
                >
                    <option value="Points">{{ 'i18n_word_points' | translate }}</option>
                    <option value="Selection">{{ 'i18n_evaluation_select' | translate }}</option>
                </select>
            </div>
        </div>
    `,
    styleUrls: ['../question.shared.scss'],
    imports: [FormsModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EssayEditorComponent {
    question = input.required<Question | QuestionDraft>();
    lotteryOn = input(false);

    setDefaultExpectedWordCount(value: number) {
        const questionValue = this.question();
        questionValue.defaultExpectedWordCount = value;
    }

    updateEvaluationType($event: string) {
        const questionValue = this.question();
        questionValue.defaultEvaluationType = $event;
        if ($event === 'Selection') {
            delete questionValue.defaultMaxScore;
        }
    }

    estimateCharacters() {
        const questionValue = this.question();
        return (questionValue.defaultExpectedWordCount || 0) * 8;
    }
}
