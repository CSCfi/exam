// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './section.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [MultiChoiceQuestionComponent, EssayQuestionComponent, ClozeTestComponent, TranslateModule, OrderByPipe],
})
export class ExamSectionComponent implements OnInit {
    section = input.required<ExamSection>();
    isScorable = input(false);
    index = input(0);
    exam = input.required<Exam>();
    participation = input.required<ExamParticipation>();
    collaborative = input(false);
    scored = output<string>();

    essayQuestionAmounts = signal<{ rejected: number; accepted: number; total: number }>({
        rejected: 0,
        accepted: 0,
        total: 0,
    });

    private Exam = inject(ExamService);
    private QuestionScore = inject(QuestionScoringService);

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
