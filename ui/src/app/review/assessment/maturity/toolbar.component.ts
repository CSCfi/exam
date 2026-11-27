// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<!-- language inspection controls  -->
        @if (isOwnerOrAdmin() || isUnderLanguageInspection()) {
            <div class="d-flex flex-row-reverse gap-2">
                <span [hidden]="isUnderLanguageInspection()">
                    @if (!isReadOnly()) {
                        <button (click)="saveAssessment()" [disabled]="!valid()" class="btn btn-success">
                            {{ 'i18n_save' | translate }}
                        </button>
                    } @else {
                        <button class="btn btn-secondary" [routerLink]="['/staff/exams', exam().parent?.id, '5']">
                            {{ 'i18n_close' | translate }}
                        </button>
                    }
                </span>
                @if (!isReadOnly() && !isDisabled()) {
                    @let warn = getNextState().warn;
                    <button
                        class="btn"
                        [class.btn-outline-danger]="warn"
                        [class.btn-success]="!warn"
                        (click)="proceed(false)"
                    >
                        {{ getNextState().text | translate }}
                    </button>
                }
                @if (
                    !isReadOnly() &&
                    getNextState().alternateState &&
                    !isDisabled(getAlternateState(getNextState().alternateState).name)
                ) {
                    @let warn = getAlternateState(getNextState().alternateState).warn;
                    <button
                        class="btn"
                        [class.btn-outline-danger]="warn"
                        [class.btn-success]="!warn"
                        (click)="proceed(true)"
                    >
                        {{ getAlternateState(getNextState().alternateState).text | translate }}
                    </button>
                }
            </div>
            @let hint = getNextState()?.hint;
            @if (!isReadOnly() && hint) {
                @let hintText = hint(exam()) || '';
                @if (hintText) {
                    <div class="d-flex justify-content-end mt-2">
                        <small class="text-danger">
                            <i class="bi-exclamation-circle me-1"></i>{{ hintText | translate }}
                        </small>
                    </div>
                }
            }
        }`,
    imports: [RouterLink, TranslateModule],
})
export class MaturityToolbarComponent {
    readonly exam = input.required<Exam>();
    readonly valid = input(false);

    private readonly Maturity = inject(MaturityService);
    private readonly Assessment = inject(AssessmentService);
    private readonly Session = inject(SessionService);
    private readonly Exam = inject(ExamService);

    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam());
    isReadOnly = () => this.Assessment.isReadOnly(this.exam());

    isUnderLanguageInspection = () =>
        this.Session.getUser().isLanguageInspector &&
        this.exam().languageInspection &&
        !this.exam().languageInspection.finishedAt;

    saveAssessment = () => this.Assessment.saveAssessment(this.exam(), this.isOwnerOrAdmin());
    getNextState = () => this.Maturity.getNextState(this.exam());
    getAlternateState = (state?: StateName) => this.Maturity.getState(state);
    proceed = (alternate: boolean) => this.Maturity.proceed(this.exam(), alternate);
    isMissingStatement = () => this.Maturity.isMissingStatement(this.exam());
    isDisabled = (name?: StateName) => {
        const state = name ? this.getAlternateState(name) : this.getNextState();
        const disabled =
            (state && !state.canProceed) || !this.valid() || (state?.validate && !state.validate(this.exam()));
        return disabled;
    };
}
