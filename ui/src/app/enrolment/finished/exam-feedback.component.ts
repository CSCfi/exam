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
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { format } from 'date-fns';
import { Exam } from 'src/app/exam/exam.model';
import { AttachmentService } from '../../shared/attachment/attachment.service';
import { FileService } from '../../shared/file/file.service';
import type { ReviewedExam, Scores } from '../enrolment.model';
import { ExamAnswersDialogComponent } from './exam-answers-dialog.component';

@Component({
    selector: 'xm-exam-feedback',
    templateUrl: './exam-feedback.component.html',
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
        this.Files.download(url, `${this.assessment.name}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`, undefined, false);
    };
}
