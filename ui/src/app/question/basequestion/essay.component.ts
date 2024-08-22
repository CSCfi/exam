// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input, OnInit } from '@angular/core';
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
                            [(ngModel)]="question.defaultExpectedWordCount"
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
    `,
    styleUrls: ['../question.shared.scss'],
    standalone: true,
    imports: [FormsModule, TranslateModule],
})
export class EssayEditorComponent implements OnInit {
    @Input() question!: Question | QuestionDraft;

    ngOnInit() {
        this.question.defaultEvaluationType = this.question.defaultEvaluationType || 'Points';
        if (this.question.defaultEvaluationType === 'Selection') {
            delete this.question.defaultMaxScore; // will screw up validation otherwise
        }
    }

    estimateCharacters = () => (this.question.defaultExpectedWordCount || 0) * 8;
}
