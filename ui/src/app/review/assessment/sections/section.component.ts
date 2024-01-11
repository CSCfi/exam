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
import { ExamService } from 'src/app/exam/exam.service';
import type { Exam, ExamParticipation, ExamSection } from '../../../exam/exam.model';
import { QuestionAmounts, QuestionService } from '../../../question/question.service';
import { OrderByPipe } from '../../../shared/sorting/order-by.pipe';
import { ClozeTestComponent } from '../questions/cloze-test.component';
import { EssayQuestionComponent } from '../questions/essay-question.component';
import { MultiChoiceQuestionComponent } from '../questions/multi-choice-question.component';

@Component({
    selector: 'xm-r-section',
    templateUrl: './section.component.html',
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

    selectionEvaluatedAmounts: { accepted: number; rejected: number } = { accepted: 0, rejected: 0 };
    selectionEssays?: QuestionAmounts;

    constructor(
        private Exam: ExamService,
        private Question: QuestionService,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit() {
        this.selectionEssays = this.Question.getQuestionAmounts(this.exam);
        this.selectionEvaluatedAmounts = this.Question.getQuestionAmountsBySection(this.section);
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    scoreSet = (revision: string) => {
        this.scored.emit(revision);
        this.selectionEvaluatedAmounts = this.Question.getQuestionAmountsBySection(this.section);
    };

    getSectionMaxScore = () => this.Exam.getSectionMaxScore(this.section);

    getSectionTotalScore = () => this.Exam.getSectionTotalNumericScore(this.section);
}
