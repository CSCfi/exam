// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';

@Component({
    selector: 'xm-examination-weighted-multi-choice-question',
    template: `
        <div class="pb-3">
            <fieldset [ariaLabel]="questionTitle()">
                <legend [hidden]="true">answer options for multiple choice question</legend>
                @for (sqo of sq().options; track sqo) {
                    <div class="exam-answer-options">
                        <label>
                            <input
                                type="checkbox"
                                name="selectedOption"
                                [(ngModel)]="sqo.answered"
                                (change)="saveOption()"
                            />
                            {{ sqo.option.option }}
                        </label>
                    </div>
                }
            </fieldset>
        </div>

        <div class="ps-0 question-type-text">
            {{ 'i18n_max_points' | translate }} {{ sq().derivedMaxScore }}, {{ 'i18n_min_points' | translate }}
            {{ sq().derivedMinScore }}
        </div>
    `,
    imports: [FormsModule, TranslateModule],
    styleUrls: ['./question.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationWeightedMultiChoiceComponent implements OnInit {
    sq = input.required<ExaminationQuestion>();
    examHash = input('');
    isPreview = input(false);
    orderOptions = input(false);

    questionTitle = computed(() => {
        // Extract plain text from HTML for aria-label (screen readers need plain text, not HTML)
        const html = this.sq().question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.documentElement.innerText;
    });

    private Examination = inject(ExaminationService);

    ngOnInit() {
        if (this.orderOptions()) {
            this.sq().options.sort((a, b) => (a.id || -1) - (b.id || -1));
        }
    }

    saveOption() {
        this.Examination.saveOption(this.examHash(), this.sq(), this.isPreview());
    }
}
