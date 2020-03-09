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
import { Component, Input } from '@angular/core';

import { AttachmentService } from '../../utility/attachment/attachment.service';
import { ReviewedExam, Scores } from '../enrolment.model';

@Component({
    selector: 'exam-feedback',
    template: require('./examFeedback.component.html'),
})
export class ExamFeedbackComponent {
    @Input() assessment: ReviewedExam;
    @Input() scores: Scores;
    @Input() collaborative: boolean;

    constructor(private Attachment: AttachmentService) {}

    downloadFeedbackAttachment = () => {
        const attachment = this.assessment.examFeedback.attachment;
        if (this.collaborative && attachment && attachment.externalId) {
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        } else {
            this.Attachment.downloadFeedbackAttachment(this.assessment);
        }
    };
    downloadStatementAttachment = () => this.Attachment.downloadStatementAttachment(this.assessment);
}
