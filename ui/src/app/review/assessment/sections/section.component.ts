// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { ClozeTestComponent } from 'src/app/review/assessment/questions/cloze-test.component';
import { EssayQuestionComponent } from 'src/app/review/assessment/questions/essay-question.component';
import { MultiChoiceQuestionComponent } from 'src/app/review/assessment/questions/multi-choice-question.component';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-section',
    templateUrl: './section.component.html',
    styleUrls: ['../assessment.shared.scss'],
    styles: `
        .section {
            margin-block: var(--xm-space-3);
            padding: var(--xm-space-3);
        }
        // Spacing of the former header row: its padding less the grid gutter at the start
        // The progress stays at the end also when it wraps under the name (phones)
        .section-header {
            align-items: start;
            row-gap: 0; // the heading's margin spaces the lines

            > :last-child {
                margin-inline-start: auto;
            }
            padding: var(--xm-space-3) var(--xm-space-3) var(--xm-space-3) var(--xm-space-1);
        }
        .section-note {
            margin-bottom: var(--xm-space-2);
        }
        // Padding, not margin: the space adds to the note's margin above, as in the former grid rows
        .section-question {
            padding-top: var(--xm-space-2);
        }
        // The former grid row's margin and its first column's margin together; padding, so that
        // it does not merge with the margin of the question card above
        .section-totals {
            padding-top: calc(var(--xm-space-4) + var(--xm-space-2));
        }
    `,
    imports: [MultiChoiceQuestionComponent, EssayQuestionComponent, ClozeTestComponent, TranslateModule, OrderByPipe],
})
export class ExamSectionComponent implements OnInit {
    readonly section = input.required<ExamSection>();
    readonly exam = input.required<Exam>();
    readonly participation = input.required<ExamParticipation>();
    readonly isScorable = input(false);
    readonly index = input(0);
    readonly collaborative = input(false);
    readonly scored = output<string>();

    readonly essayQuestionAmounts = signal<{ rejected: number; accepted: number; total: number }>({
        rejected: 0,
        accepted: 0,
        total: 0,
    });

    private readonly Exam = inject(ExamService);
    private readonly QuestionScore = inject(QuestionScoringService);

    ngOnInit() {
        this.essayQuestionAmounts.set(this.QuestionScore.getEssayQuestionAmountsBySection(this.section()));
    }

    scoreSet = (revision: string) => {
        this.scored.emit(revision);
        this.essayQuestionAmounts.set(this.QuestionScore.getEssayQuestionAmountsBySection(this.section()));
    };

    // getReviewProgress gathers the questions that have been reviewed by calculating essay answers that have been evaluated plus the rest of the questions.
    // Since the essay questions are the only ones that need to be evaluated and the rest of the questions are evaluated automatically.
    getReviewProgress = () => {
        const sectionValue = this.section();
        return sectionValue.sectionQuestions.filter((q: ExamSectionQuestion) => {
            return q.question.type !== 'EssayQuestion' || isNumber(q.essayAnswer?.evaluatedScore);
        }).length;
    };

    getTotalQuestionAmount = () => {
        return this.section().sectionQuestions.length;
    };

    getSectionMaxScore = () => this.Exam.getSectionMaxScore(this.section());

    getSectionTotalScore = () => this.Exam.getSectionTotalNumericScore(this.section());
}
