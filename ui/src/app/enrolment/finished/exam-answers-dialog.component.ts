// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Exam } from 'src/app/exam/exam.model';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { AnsweredQuestion } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';

@Component({
    selector: 'xm-exam-answers-dialog',
    templateUrl: './exam-answers-dialog.component.html',
    imports: [TranslateModule, MathJaxDirective, UpperCasePipe, DatePipe, CourseCodeComponent],
})
export class ExamAnswersDialogComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() participationTime = '';
    @Input() participationDuration: number | string = 0;

    activeModal = inject(NgbActiveModal);
    private CommonExam = inject(CommonExamService);
    private Attachment = inject(AttachmentService);

    ngOnInit() {
        this.exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        this.exam.examSections.forEach((es) => es.sectionQuestions.sort((a, b) => a.sequenceNumber - b.sequenceNumber));
    }

    downloadAttachment = (answer: ExamSectionQuestion) =>
        this.Attachment.downloadQuestionAnswerAttachment(answer as AnsweredQuestion);
    getGradeName = (grade: string): string => this.CommonExam.getExamGradeDisplayName(grade);

    countWords = (answer: ExamSectionQuestion) => this.CommonExam.countWords(answer.essayAnswer?.answer);
    countCharacters = (answer: ExamSectionQuestion) => this.CommonExam.countCharacters(answer.essayAnswer?.answer);
    getAnsweredOptions = (answer: ExamSectionQuestion) => answer.options.filter((o) => o.answered);
    isMultiChoice = (answer: ExamSectionQuestion) =>
        ['WeightedMultipleChoiceQuestion', 'MultipleChoiceQuestion', 'ClaimChoiceQuestion'].indexOf(
            answer.question.type,
        ) > -1;
}
