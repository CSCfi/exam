// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    inject,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { ClozeTestComponent } from 'src/app/review/assessment/questions/cloze-test.component';
import { EssayQuestionComponent } from 'src/app/review/assessment/questions/essay-question.component';
import { LtiQuestionComponent } from 'src/app/review/assessment/questions/lti-question.component';
import { MultiChoiceQuestionComponent } from 'src/app/review/assessment/questions/multi-choice-question.component';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-section',
    templateUrl: './section.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [
        MultiChoiceQuestionComponent,
        EssayQuestionComponent,
        ClozeTestComponent,
        TranslateModule,
        OrderByPipe,
        FormsModule,
        ReactiveFormsModule,
        LtiQuestionComponent,
    ],
})
export class ExamSectionComponent implements OnInit, AfterViewInit {
    @Input() section!: ExamSection;
    @Input() isScorable = false;
    @Input() index = 0;
    @Input() exam!: Exam;
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;
    @Output() scored = new EventEmitter<string>();

    essayQuestionAmounts = { rejected: 0, accepted: 0, total: 0 };

    private Exam = inject(ExamService);
    private QuestionScore = inject(QuestionScoringService);
    private cdr = inject(ChangeDetectorRef);

    ngOnInit() {
        this.essayQuestionAmounts = this.QuestionScore.getEssayQuestionAmountsBySection(this.section);
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    scoreSet = (revision: string) => {
        this.scored.emit(revision);
        this.essayQuestionAmounts = this.QuestionScore.getEssayQuestionAmountsBySection(this.section);
    };

    // getReviewProgress gathers the questions that have been reviewed by calculating essay answers that have been evaluated plus the rest of the questions.
    // Since the essay questions are the only ones that need to be evaluated and the rest of the questions are evaluated automatically.
    getReviewProgress = () => {
        return this.section.sectionQuestions.filter((q: ExamSectionQuestion) => {
            if (q.question.type === 'EssayQuestion') {
                // Essay is reviewed when evaluatedScore is set
                return isNumber(q.essayAnswer?.evaluatedScore);
            }
            if (q.question.type === 'LtiQuestion') {
                //return isNumber(q.forcedScore);
                return isNumber(q.essayAnswer?.evaluatedScore);
            }

            // All other question types are automatically evaluated
            return true;
        }).length;
    };

    getTotalQuestionAmount = () => {
        return this.section.sectionQuestions.length;
    };

    getSectionMaxScore = () => this.Exam.getSectionMaxScore(this.section);

    getSectionTotalScore = () => this.Exam.getSectionTotalNumericScore(this.section);
}
