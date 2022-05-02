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
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { WindowRef } from '../../../utility/window/window.service';
import { AssessmentService } from '../../assessment/assessment.service';

import type { Exam } from '../../../exam/exam.model';

@Component({
    selector: 'speed-review-feedback',
    templateUrl: './feedback.component.html',
})
export class SpeedReviewFeedbackComponent {
    @Input() exam!: Exam;

    constructor(private modal: NgbActiveModal, private Window: WindowRef, private Assessment: AssessmentService) {}

    ngOnInit() {
        if (!this.exam.examFeedback) {
            this.exam.examFeedback = { comment: '' };
        }
    }

    ok = () => {
        if (!this.exam.examFeedback) {
            this.exam.examFeedback = { comment: '', feedbackStatus: false };
        }
        this.Assessment.saveFeedback$(this.exam).subscribe(this.modal.close);
    };

    cancel = () => this.modal.dismiss();
}
