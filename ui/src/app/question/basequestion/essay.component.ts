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
import { Component, Input, OnInit } from '@angular/core';
import type { Question } from '../../exam/exam.model';
import { QuestionDraft } from '../question.service';

@Component({
    selector: 'xm-essay-editor',
    template: `
        <form name="essayForm">
            <div class="row mt-3">
                <div class="col-md-3 exam-basic-title">
                    {{ 'sitnet_essay_length_recommendation' | translate }}
                </div>
                <div class="col-md-6">
                    <div class="input-group">
                        <input
                            id="wc"
                            name="wc"
                            #wc="ngModel"
                            type="number"
                            lang="en"
                            class="form-control"
                            [(ngModel)]="question.defaultExpectedWordCount"
                            [min]="1"
                            [max]="1000000"
                        />
                        <span class="input-group-text" title="{{ 'sitnet_average_word_length_finnish' | translate }}">
                            {{ 'sitnet_approximately' | translate }} {{ estimateCharacters() }}
                            {{ 'sitnet_characters' | translate }}
                        </span>
                    </div>
                    <div *ngIf="wc.invalid" class="warning-text-small margin-10">
                        <i class="bi-exclamation-circle reddish"></i>
                        {{ 'sitnet_essay_length_recommendation_bounds' | translate }}
                    </div>
                </div>
            </div>
        </form>
    `,
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
