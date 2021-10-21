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
import { UIRouterGlobals } from '@uirouter/core';

import { ExamParticipation } from '../../../exam/exam.model';
import { Examination } from '../../../examination/examination.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { FileService } from '../../../utility/file/file.service';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborativeAssessment.service';

import type { FileResult } from '../../../utility/attachment/dialogs/attachmentSelector.component';
@Component({
    selector: 'r-feedback',
    templateUrl: './feedback.component.html',
})
export class FeedbackComponent {
    @Input() exam: Examination;
    @Input() collaborative: boolean;
    @Input() participation: ExamParticipation;
    feedbackComment = '';

    hideEditor = false;

    constructor(
        private routing: UIRouterGlobals,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    toggleFeedbackVisibility = () => (this.hideEditor = !this.hideEditor);

    saveFeedback = () => {
        if (this.collaborative) {
            this._saveCollaborativeFeedback$().subscribe();
        } else {
            this._saveFeedback$().subscribe();
        }
    };

    private _saveFeedback$ = () => this.Assessment.saveFeedback$(this.exam);

    private _saveCollaborativeFeedback$ = () =>
        this.CollaborativeAssessment.saveFeedback$(this.routing.params.id, this.routing.params.ref, this.participation);

    private _upload = (res: FileResult, url: string) =>
        this.Files.upload(
            url,
            res.$value.attachmentFile,
            { examId: this.exam.id.toString() },
            this.exam.examFeedback,
            () => {
                // kinda hacky, but let's do this mangling for time being
                this.participation._rev = this.exam.examFeedback?.attachment?.rev;
                delete this.exam.examFeedback?.attachment?.rev;
            },
        );

    selectFile = () => {
        this.Attachment.selectFile(false, {}).then((res: FileResult) => {
            if (this.collaborative) {
                this._saveCollaborativeFeedback$().subscribe(() => {
                    const url = `/integration/iop/attachment/exam/${this.routing.params.id}/${this.routing.params.ref}/feedback`;
                    this._upload(res, url);
                });
            } else {
                this._saveFeedback$().subscribe(() => {
                    const url = `/app/attachment/exam/${this.exam.id}/feedback`;
                    this._upload(res, url);
                });
            }
        });
    };

    downloadFeedbackAttachment = () => {
        const attachment = this.exam.examFeedback?.attachment;
        if (!attachment) {
            return;
        }
        this.collaborative && attachment.externalId
            ? this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName)
            : this.Attachment.downloadFeedbackAttachment(this.exam);
    };

    removeFeedbackAttachment = () => {
        if (this.collaborative) {
            this.Attachment.removeExternalFeedbackAttachment(
                this.routing.params.id,
                this.routing.params.ref,
                this.participation,
            );
        } else {
            this.Attachment.removeFeedbackAttachment(this.exam);
        }
    };
}
