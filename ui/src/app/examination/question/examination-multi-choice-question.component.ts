/*
 * Copyright (c) 2017 Exam Consortium
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
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';

@Component({
    selector: 'xm-examination-multi-choice-question',
    template: `
        <div class="pb-3">
            <fieldset [attr.aria-label]="questionTitle">
                <legend [hidden]="true">answer options for multiple choice question</legend>
                @for (sqo of sq.options; track sqo) {
                    <div class="exam-answer-options">
                        <label>
                            <input
                                name="option-{{ sqo.id }}"
                                id="option-{{ sqo.id }}"
                                type="radio"
                                [checked]="sqo.answered"
                                [value]="sqo.id"
                                [(ngModel)]="sq.selectedOption"
                                (change)="saveOption()"
                            />
                            {{ sqo.option.option }}
                        </label>
                    </div>
                }
            </fieldset>
        </div>
        @if (sq.question.type !== 'ClaimChoiceQuestion') {
            <div class="ps-0 question-type-text">{{ sq.derivedMaxScore }} {{ 'i18n_unit_points' | translate }}</div>
        }
        @if (sq.question.type === 'ClaimChoiceQuestion' && sq.derivedMinScore !== null) {
            <div class="ps-0 question-type-text">
                {{ 'i18n_max_points' | translate }} {{ sq.derivedMaxScore }} {{ 'i18n_min_points' | translate }}
                {{ sq.derivedMinScore }}
            </div>
        }
    `,
    standalone: true,
    imports: [FormsModule, TranslateModule],
    styleUrls: ['./question.shared.scss'],
})
export class ExaminationMultiChoiceComponent implements OnInit {
    @Input() sq!: ExaminationQuestion;
    @Input() examHash = '';
    @Input() isPreview = false;
    @Input() orderOptions = false;

    questionTitle!: string;

    constructor(private Examination: ExaminationService) {}

    ngOnInit() {
        if (this.sq.question.type === 'ClaimChoiceQuestion' && this.orderOptions) {
            this.sq.options.sort((a, b) => (a.option.id || 0) - (b.option.id || 0));
        } else if (this.orderOptions) {
            this.sq.options.sort((a, b) => (a.id || -1) - (b.id || -1));
        }

        const answered = this.sq.options.filter((o) => o.answered);
        if (answered.length > 1) {
            console.warn('several answered options for mcq');
        }
        if (answered.length === 1) {
            this.sq.selectedOption = answered[0].id as number;
        }
        const html = this.sq.question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const decodedString = doc.documentElement.innerText;
        this.questionTitle = decodedString;
    }

    saveOption = () => this.Examination.saveOption(this.examHash, this.sq, this.isPreview);
}
