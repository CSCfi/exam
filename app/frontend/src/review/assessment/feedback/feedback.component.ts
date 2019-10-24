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
import { Component, Input, ViewChild } from '@angular/core';
import { Participation } from '../../../exam/exam.model';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborativeAssessment.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { FileService } from '../../../utility/file/file.service';
import { Examination } from '../../../examination/examination.service';
import { FileResult } from '../../../utility/attachment/dialogs/attachmentSelector.component';

// add jquery reference
declare let $: any;

@Component({
    selector: 'r-feedback',
    template: require('./feedback.component.html'),
})
export class FeedbackComponent {
    @Input() exam: Examination;
    @Input() collaborative: boolean;
    @Input() participation: Participation;

    hideEditor = false;

    constructor(
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    toggleFeedbackVisibility = () => {
        const selector = $('.body');
        if (this.hideEditor) {
            selector.show();
        } else {
            selector.hide();
        }
        this.hideEditor = !this.hideEditor;
    };

    saveFeedback = (id?: number, ref?: string) => {
        if (this.collaborative && id && ref) {
            this.CollaborativeAssessment.saveFeedback(id, ref, this.participation);
        } else {
            this.Assessment.saveFeedback$(this.exam).subscribe();
        }
    };

    selectFile = () => {
        this.Attachment.selectFile(true, {}).then((res: FileResult) =>
            this.Assessment.saveFeedback$(this.exam).subscribe(() => {
                this.Files.upload(
                    `/app/attachment/exam/${this.exam.id}/feedback`,
                    res.$value.attachmentFile,
                    { examId: this.exam.id },
                    this.exam.examFeedback,
                );
            }),
        );
    };

    downloadFeedbackAttachment = () => this.Attachment.downloadFeedbackAttachment(this.exam);

    removeFeedbackAttachment = () => this.Attachment.removeFeedbackAttachment(this.exam);
}
