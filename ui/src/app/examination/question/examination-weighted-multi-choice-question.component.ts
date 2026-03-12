// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import type { ExamSectionQuestionOption } from 'src/app/question/question.model';

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
                                [checked]="sqo.answered"
                                (change)="onOptionChange(sqo, $event)"
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
    imports: [TranslateModule],
    styleUrls: ['./question.shared.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationWeightedMultiChoiceComponent implements OnInit {
    readonly sq = input.required<ExaminationQuestion>();
    readonly examHash = input('');
    readonly isPreview = input(false);
    readonly isExternal = input(false);
    readonly orderOptions = input(false);

    readonly questionTitle = computed(() => {
        // Extract plain text from HTML for aria-label (screen readers need plain text, not HTML)
        const html = this.sq().question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.documentElement.innerText;
    });

    private readonly Examination = inject(ExaminationService);

    ngOnInit() {
        if (this.orderOptions()) {
            this.sq().options.sort((a, b) => (a.id || -1) - (b.id || -1));
        }
    }

    onOptionChange = (sqo: ExamSectionQuestionOption, event: Event) => {
        sqo.answered = (event.target as HTMLInputElement).checked;
        this.saveOption();
    };

    saveOption() {
        this.Examination.saveOption(this.examHash(), this.sq(), {
            preview: this.isPreview(),
            external: this.isExternal(),
        });
    }
}
