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
import { NgFor, NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from '../examination.model';
import { ExaminationService } from '../examination.service';

@Component({
    selector: 'xm-examination-multi-choice-question',
    template: `
        <div class="bottom-padding-2">
            <fieldset [attr.aria-label]="questionTitle">
                <legend style="visibility: hidden;">answer options for multiple choice question</legend>
                <div *ngFor="let sqo of sq.options" class="exam-answer-options">
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
            </fieldset>
        </div>
        <div *ngIf="sq.question.type !== 'ClaimChoiceQuestion'" class="padl0 question-type-text">
            {{ sq.derivedMaxScore }} {{ 'i18n_unit_points' | translate }}
        </div>
        <div
            *ngIf="sq.question.type === 'ClaimChoiceQuestion' && sq.derivedMinScore !== null"
            class="padl0 question-type-text"
        >
            {{ 'i18n_max_points' | translate }} {{ sq.derivedMaxScore }} {{ 'i18n_min_points' | translate }}
            {{ sq.derivedMinScore }}
        </div>
    `,
    standalone: true,
    imports: [NgFor, FormsModule, NgIf, TranslateModule],
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
