// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input, OnInit, inject } from '@angular/core';
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
                {{ 'i18n_max_points' | translate }} {{ sq.derivedMaxScore }}, {{ 'i18n_min_points' | translate }}
                {{ sq.derivedMinScore }}
            </div>
        }
    `,
    imports: [FormsModule, TranslateModule],
    styleUrls: ['./question.shared.scss'],
})
export class ExaminationMultiChoiceComponent implements OnInit {
    @Input() sq!: ExaminationQuestion;
    @Input() examHash = '';
    @Input() isPreview = false;
    @Input() orderOptions = false;

    questionTitle!: string;

    private Examination = inject(ExaminationService);

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
