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
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamParticipation } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import type { Examination } from '../../../examination/examination.model';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborative-assessment.service';

@Component({
    selector: 'r-toolbar',
    template: `<!-- Buttons -->
        <div class="review-toolbar-wrapper pt-4 padl0 padr0 marb20 float-right">
            <div class="review-attachment-button exam-questions-buttons marl15">
                <a
                    class="pointer preview"
                    [uiSref]="getExitState().name || ''"
                    [uiParams]="getExitState().params"
                    [hidden]="(!isReadOnly() && isOwnerOrAdmin()) || (!isReadOnly() && !isGraded())"
                >
                    {{ 'sitnet_close' | translate }}
                </a>
            </div>

            <div [hidden]="isReadOnly()" class="review-attachment-button exam-questions-buttons">
                <button
                    class="pointer warning-filled"
                    *ngIf="isMaturityRejection()"
                    [disabled]="!isOwnerOrAdmin() || !valid"
                    (click)="rejectMaturity()"
                >
                    {{ 'sitnet_reject_maturity' | translate }}
                </button>
            </div>

            <div [hidden]="isReadOnly()" class="review-attachment-button exam-questions-buttons marl10">
                <button
                    class="pointer"
                    [disabled]="isReadOnly()"
                    (click)="saveAssessment()"
                    ngbPopover="{{ 'sitnet_save_changes_popover_info' | translate }}"
                    triggers="mouseenter:mouseleave"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                >
                    {{ 'sitnet_save_changes' | translate }}
                </button>
            </div>
            <div [hidden]="isReadOnly()" class="review-attachment-button exam-questions-buttons marl10">
                <span
                    class="disabled-button-popover-wrapper"
                    ngbPopover="{{ 'sitnet_send_result_to_registry_popover_info' | translate }}"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <button
                        class="pointer"
                        *ngIf="!isMaturityRejection()"
                        [disabled]="!isOwnerOrAdmin() || !valid"
                        (click)="createExamRecord()"
                    >
                        {{ 'sitnet_send_result_to_registry' | translate }}
                    </button>
                </span>
            </div>
        </div> `,
})
export class ToolbarComponent {
    @Input() valid = false;
    @Input() participation!: ExamParticipation;
    @Input() collaborative = false;
    @Input() exam!: Examination;

    constructor(
        private state: StateService,
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Exam: ExamService,
    ) {}

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam, this.collaborative);
    isReadOnly = () => this.Assessment.isReadOnly(this.exam);
    isGraded = () => this.Assessment.isGraded(this.exam);
    isMaturityRejection = () =>
        this.exam?.executionType.type === 'MATURITY' &&
        !this.exam.subjectToLanguageInspection &&
        this.exam.grade &&
        this.exam.grade.marksRejection;

    saveAssessment = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.saveAssessment(
                this.participation,
                this.isOwnerOrAdmin(),
                this.routing.params.id,
                this.routing.params.ref,
            );
        } else {
            this.Assessment.saveAssessment(this.exam, this.isOwnerOrAdmin());
        }
    };

    createExamRecord = () => {
        if (this.collaborative) {
            this.CollaborativeAssessment.createExamRecord(
                this.participation,
                this.routing.params.id,
                this.routing.params.ref,
            );
        } else {
            this.Assessment.createExamRecord$(this.exam, true).subscribe(() => {
                this.toast.info(this.translate.instant('sitnet_review_recorded'));
                const state = this.getExitState();
                this.state.go(state.name as string, state.params);
            });
        }
    };

    rejectMaturity = () =>
        this.Assessment.rejectMaturity$(this.exam).subscribe(() => {
            this.toast.info(this.translate.instant('sitnet_maturity_rejected'));
            const state = this.getExitState();
            this.state.go(state.name as string, state.params);
        });

    getExitState = () => this.Assessment.getExitState(this.exam, this.collaborative);
}
