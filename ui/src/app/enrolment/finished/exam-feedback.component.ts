// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ReviewedExam, Scores } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ExamAnswersDialogComponent } from './exam-answers-dialog.component';

@Component({
    selector: 'xm-exam-feedback',
    templateUrl: './exam-feedback.component.html',
    imports: [NgClass, DatePipe, TranslateModule],
    styles: [
        `
            .notice-wrap {
                margin-left: 1em;
                display: inline-block;
                margin-bottom: 30px;
                margin-top: 10px;
            }
        `,
    ],
})
export class ExamFeedbackComponent implements OnInit {
    @Input() assessment!: ReviewedExam;
    @Input() participationTime = '';
    @Input() participationDuration: number | string = 0;
    @Input() scores!: Scores;
    @Input() collaborative = false;

    assessmentWithAnswers?: Exam;

    constructor(
        private http: HttpClient,
        private modal: NgbModal,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    ngOnInit() {
        if (!this.collaborative) {
            this.http
                .get<Exam | undefined>(`/app/feedback/exams/${this.assessment.id}/answers`)
                .subscribe((exam) => (this.assessmentWithAnswers = exam));
        }
    }
    downloadFeedbackAttachment = () => {
        const attachment = this.assessment.examFeedback?.attachment;
        if (this.collaborative && attachment && attachment.externalId) {
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        } else {
            this.Attachment.downloadFeedbackAttachment(this.assessment);
        }
    };
    downloadStatementAttachment = () => this.Attachment.downloadStatementAttachment(this.assessment);

    showAnswers = () => {
        const modal = this.modal.open(ExamAnswersDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'xl',
        });
        modal.componentInstance.exam = this.assessmentWithAnswers;
        modal.componentInstance.participationTime = this.participationTime;
        modal.componentInstance.participationDuration = this.participationDuration;
    };

    downloadScoreReport = () => {
        const url = `/app/feedback/exams/${this.assessment.id}/report`;
        this.Files.download(
            url,
            `${this.assessment.name}_${DateTime.now().toFormat('dd-LL-yyyy')}.xlsx`,
            undefined,
            false,
        );
    };
}
