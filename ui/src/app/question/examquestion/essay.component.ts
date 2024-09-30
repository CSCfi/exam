// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, input, output } from '@angular/core';
import { ControlContainer, FormsModule, NgForm } from '@angular/forms';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-eq-essay',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    standalone: true,
    imports: [FormsModule, NgbPopoverModule, TranslateModule],
    styleUrls: ['../question.shared.scss'],
    template: `
        <div ngModelGroup="essay" id="essay">
            <div class="row">
                <div class="col-md-12 mt-2 pr-0">
                    <div class="xm-paragraph-title">{{ 'i18n_comments' | translate }}</div>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-md-3">
                    {{ 'i18n_essay_length_recommendation' | translate }}
                </div>
                <span class="col-md-4">
                    <div class="input-group" id="expectedWordCount">
                        <input
                            name="expectedWordCount"
                            type="number"
                            lang="en"
                            class="form-control"
                            [ngModel]="expectedWordCount()"
                            (ngModelChange)="updateWordCount($event)"
                            [min]="1"
                            [max]="1000000"
                            #wordCount="ngModel"
                        />
                        <span class="input-group-text" title="{{ 'i18n_average_word_length_finnish' | translate }}">
                            {{ 'i18n_approximately' | translate }} {{ estimateCharacters() }}
                            {{ 'i18n_characters' | translate }}
                        </span>
                    </div>
                    @if (wordCount.invalid) {
                        <div class="warning-text-small m-1 edit-warning-container">
                            <i class="bi-exclamation-circle text-danger me-2"></i>
                            {{ 'i18n_essay_length_recommendation_bounds' | translate }}
                        </div>
                    }
                </span>
            </div>
            <div class="row mt-2">
                <div class="col-md-3">
                    {{ 'i18n_evaluation_type' | translate }}
                </div>
                <div class="col-md-2">
                    <select
                        id="evaluationType"
                        class="form-select w-75"
                        name="evaluationType"
                        [ngModel]="evaluationType()"
                        (ngModelChange)="updateEvaluationType($event)"
                        required="true"
                    >
                        <option value="Points">{{ 'i18n_word_points' | translate }}</option>
                        <option value="Selection">{{ 'i18n_evaluation_select' | translate }}</option>
                    </select>
                </div>
            </div>
        </div>
        <!-- Evaluation criteria -->
        <div class="row mt-3">
            <div class="col-md-3">
                {{ 'i18n_exam_evaluation_criteria' | translate }}
                <sup
                    ngbPopover="{{ 'i18n_question_evaluation_criteria_description' | translate }}"
                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <img src="/assets/images/icon_tooltip.svg" alt="" />
                </sup>
            </div>
            <div class="col-md-9 pe-0">
                <textarea
                    id="defaultEvaluationCriteria"
                    name="defaultEvaluationCriteria"
                    class="form-control"
                    rows="3"
                    [ngModel]="evaluationCriteria()"
                    (ngModelChange)="updateEvaluationCriteria($event)"
                    placeholder="{{ 'i18n_exam_evaluation_criteria' | translate }}"
                >
                </textarea>
            </div>
        </div>
    `,
})
export class EssayComponent {
    evaluationType = input<string>();
    expectedWordCount = input<number>();
    evaluationCriteria = input<string>();

    evaluationTypeChanged = output<string>();
    expectedWordCountChanged = output<number>();
    evaluationCriteriaChanged = output<string>();

    updateEvaluationType = (type: string) => this.evaluationTypeChanged.emit(type);
    updateWordCount = (count: number) => this.expectedWordCountChanged.emit(count);
    updateEvaluationCriteria = (criteria: string) => this.evaluationCriteriaChanged.emit(criteria);
    estimateCharacters = () => (this.expectedWordCount() || 0) * 8;
}
