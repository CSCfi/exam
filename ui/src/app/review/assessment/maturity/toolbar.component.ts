// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { SessionService } from 'src/app/session/session.service';
import type { StateName } from './maturity.service';
import { MaturityService } from './maturity.service';

@Component({
    selector: 'xm-r-maturity-toolbar',
    template: `<!-- language inspection controls  -->
        @if (isOwnerOrAdmin() || isUnderLanguageInspection()) {
            <div class="d-flex flex-row-reverse">
                <span [hidden]="isUnderLanguageInspection()">
                    <div class="ms-1">
                        @if (!isReadOnly()) {
                            <button (click)="saveAssessment()" [disabled]="!valid" class="btn btn-success">
                                {{ 'i18n_save' | translate }}
                            </button>
                        } @else {
                            <button class="btn btn-secondary" [routerLink]="['/staff/exams', exam.parent?.id, '5']">
                                {{ 'i18n_close' | translate }}
                            </button>
                        }
                    </div>
                </span>
                @if (!isReadOnly() && !isDisabled()) {
                    <div class="ms-1">
                        <button
                            [ngClass]="getNextState().warn ? 'btn btn-outline-danger' : 'btn btn-success'"
                            (click)="proceed(false)"
                        >
                            {{ getNextState().text | translate }}
                        </button>
                    </div>
                }
                @if (
                    !isReadOnly() &&
                    getNextState().alternateState &&
                    !isDisabled(getAlternateState(getNextState().alternateState).name)
                ) {
                    <div class="ms-1">
                        <button
                            [ngClass]="
                                getAlternateState(getNextState().alternateState).warn
                                    ? 'btn btn-outline-danger'
                                    : 'btn btn-success'
                            "
                            (click)="proceed(true)"
                        >
                            {{ getAlternateState(getNextState().alternateState).text | translate }}
                        </button>
                    </div>
                }
                @if (!isReadOnly() && getNextState().alternateState) {
                    @if (isMissingStatement()) {
                        <span class="text-danger"
                            >&nbsp; <i class="bi-exclamation-circle"></i>&nbsp;{{
                                getNextState()?.hint(exam) || '' | translate
                            }}</span
                        >
                    }
                }
                @if (!isReadOnly() && !getNextState().alternateState) {
                    @if (getNextState()?.hint) {
                        <span class="text-danger"
                            >&nbsp; <i class="bi-exclamation-circle"></i>&nbsp;{{
                                getNextState()?.hint(exam) || '' | translate
                            }}</span
                        >
                    }
                }
            </div>
        }`,
    imports: [RouterLink, NgClass, TranslateModule],
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
