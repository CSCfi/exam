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
import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';

import { Exam, ExamParticipation, ExamSection } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { QuestionService } from '../../../question/question.service';

@Component({
    selector: 'r-exam-section',
    templateUrl: './examSection.component.html',
})
export class ExamSectionComponent {
    @Input() section: ExamSection;
    @Input() isScorable: boolean;
    @Input() index: number;
    @Input() exam: Exam;
    @Input() participation: ExamParticipation;
    @Input() collaborative: boolean;
    @Output() onScore = new EventEmitter<string>();

    selectionEvaluatedAmounts: { accepted: number; rejected: number };

    constructor(private Exam: ExamService, private Question: QuestionService, private cdr: ChangeDetectorRef) {}

    ngOnInit() {
        this.selectionEvaluatedAmounts = this.Question.getQuestionAmountsBySection(this.section);
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    scoreSet = (revision: string) => {
        this.onScore.emit(revision);
        this.selectionEvaluatedAmounts = this.Question.getQuestionAmountsBySection(this.section);
    };

    getSectionMaxScore = () => this.Exam.getSectionMaxScore(this.section);

    getSectionTotalScore = () => this.Exam.getSectionTotalNumericScore(this.section);
}
