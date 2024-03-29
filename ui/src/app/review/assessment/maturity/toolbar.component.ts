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
import type { Exam } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { SessionService } from '../../../session/session.service';
import { AssessmentService } from '../assessment.service';
import type { StateName } from './maturity.service';
import { MaturityService } from './maturity.service';

@Component({
    selector: 'xm-r-maturity-toolbar',
    template: `<!-- language inspection controls  -->
        <div class="float-end" *ngIf="isOwnerOrAdmin() || isUnderLanguageInspection()">
            <span [hidden]="isUnderLanguageInspection()">
                <div *ngIf="!isReadOnly()" class="review-attachment-button exam-questions-buttons marl10">
                    <button (click)="saveAssessment()" [disabled]="!valid" class="btn inspection-button">
                        {{ 'sitnet_save' | translate }}
                    </button>
                </div>
                <div *ngIf="isReadOnly()" class="review-attachment-button exam-questions-buttons marl15">
                    <a class="pointer preview" [routerLink]="['/staff/exams', exam.parent?.id, '5']">
                        {{ 'sitnet_close' | translate }}</a
                    >
                </div>
            </span>

            <div *ngIf="!isReadOnly() && !isDisabled()" class="review-attachment-button exam-questions-buttons marl10">
                <button
                    class="btn inspection-button"
                    [ngClass]="getNextState().warn ? 'warning-filled' : ''"
                    (click)="proceed(false)"
                >
                    {{ getNextState().text | translate }}
                </button>
            </div>
            <div
                *ngIf="
                    !isReadOnly() &&
                    getNextState().alternateState &&
                    !isDisabled(getAlternateState(getNextState().alternateState).name)
                "
                class="review-attachment-button exam-questions-buttons marl10"
            >
                <button
                    class="btn inspection-button"
                    [ngClass]="getAlternateState(getNextState().alternateState).warn ? 'warning-filled' : 'btn-primary'"
                    (click)="proceed(true)"
                >
                    {{ getAlternateState(getNextState().alternateState).text | translate }}
                </button>
            </div>
            <div
                *ngIf="!isReadOnly() && getNextState().alternateState"
                class="review-attachment-button exam-questions-buttons"
            >
                <span *ngIf="isMissingStatement()" class="text-danger"
                    >&nbsp; <i class="bi-exclamation-circle"></i>&nbsp;{{
                        getNextState()?.hint(exam) || '' | translate
                    }}</span
                >
            </div>
            <div
                *ngIf="!isReadOnly() && !getNextState().alternateState"
                class="review-attachment-button exam-questions-buttons"
            >
                <span *ngIf="getNextState()?.hint" class="text-danger"
                    >&nbsp; <i class="bi-exclamation-circle"></i>&nbsp;{{
                        getNextState()?.hint(exam) || '' | translate
                    }}</span
                >
            </div>
        </div> `,
})
export class MaturityToolbarComponent {
    @Input() exam!: Exam;
    @Input() valid = false;

    constructor(
        private Maturity: MaturityService,
        private Assessment: AssessmentService,
        private Session: SessionService,
        private Exam: ExamService,
    ) {}

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam);
    isReadOnly = () => this.Assessment.isReadOnly(this.exam);

    isUnderLanguageInspection = () =>
        this.Session.getUser().isLanguageInspector &&
        this.exam.languageInspection &&
        !this.exam.languageInspection.finishedAt;

    saveAssessment = () => this.Assessment.saveAssessment(this.exam, this.isOwnerOrAdmin());
    getNextState = () => this.Maturity.getNextState(this.exam);
    getAlternateState = (state?: StateName) => this.Maturity.getState(state);
    proceed = (alternate: boolean) => this.Maturity.proceed(this.exam, alternate);
    isMissingStatement = () => this.Maturity.isMissingStatement(this.exam);
    isDisabled = (name?: StateName) => {
        const state = name ? this.getAlternateState(name) : this.getNextState();
        const disabled = (state && !state.canProceed) || !this.valid || (state?.validate && !state.validate(this.exam));
        return disabled;
    };
}
