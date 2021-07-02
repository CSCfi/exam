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
import { TransitionService } from '@uirouter/core';

import { ExamSectionQuestion } from '../../exam/exam.model';
import { WindowRef } from '../../utility/window/window.service';

import type { Question } from '../../exam/exam.model';

// This component is used for editing distributed exam questions.
@Component({
    selector: 'exam-question-editor',
    template: `
        <div id="sitnet-dialog">
            <div class="modal-body">
                <exam-question
                    *ngIf="examQuestion"
                    [examQuestion]="examQuestion"
                    (onSave)="onSave($event)"
                    (onCancel)="cancel()"
                    [lotteryOn]="lotteryOn"
                ></exam-question>
            </div>
            <div class="modal-footer"></div>
        </div>
    `,
})
export class ExamQuestionEditorComponent {
    @Input() examQuestion: ExamSectionQuestion;
    @Input() lotteryOn: boolean;
    transitionWatcher: unknown;

    constructor(private modal: NgbActiveModal, private transition: TransitionService, private Window: WindowRef) {
        this.transitionWatcher = this.transition.onBefore({}, () => {
            if (!this.Window.nativeWindow.onbeforeunload) {
                this.cancel();
            }
        });
    }

    onSave = (event: { question: Question; examQuestion: ExamSectionQuestion }) => this.modal.close(event);
    cancel = () => this.modal.dismiss();
}
