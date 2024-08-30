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

import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam, ExamParticipation, ExamSection, ExamSectionQuestion } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { QuestionService } from 'src/app/question/question.service';
import { ClozeTestComponent } from 'src/app/review/assessment/questions/cloze-test.component';
import { EssayQuestionComponent } from 'src/app/review/assessment/questions/essay-question.component';
import { MultiChoiceQuestionComponent } from 'src/app/review/assessment/questions/multi-choice-question.component';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-section',
    templateUrl: './section.component.html',
    styleUrls: ['../assessment.shared.scss'],
    standalone: true,
    imports: [MultiChoiceQuestionComponent, EssayQuestionComponent, ClozeTestComponent, TranslateModule, OrderByPipe],
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

    constructor(
        private Exam: ExamService,
        private Question: QuestionService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit() {
        this.essayQuestionAmounts = this.Question.getEssayQuestionAmountsBySection(this.section);
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    scoreSet = (revision: string) => {
        this.scored.emit(revision);
        this.essayQuestionAmounts = this.Question.getEssayQuestionAmountsBySection(this.section);
    };

    // getReviewProgress gathers the questions that have been reviewed by calculating essay answers that have been evaluated plus the rest of the questions.
    // Since the essay questions are the only ones that need to be evaluated and the rest of the questions are evaluated automatically.
    getReviewProgress = () => {
        return this.section.sectionQuestions.filter((q: ExamSectionQuestion) => {
            return q.question.type !== 'EssayQuestion' || isNumber(q.essayAnswer?.evaluatedScore);
        }).length;
    };

    getTotalQuestionAmount = () => {
        return this.section.sectionQuestions.length;
    };

    getSectionMaxScore = () => this.Exam.getSectionMaxScore(this.section);

    getSectionTotalScore = () => this.Exam.getSectionTotalNumericScore(this.section);
}
