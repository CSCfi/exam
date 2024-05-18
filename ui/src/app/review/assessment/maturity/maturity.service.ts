// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'ramda';
import { throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import type { LanguageInspection } from 'src/app/maturity/maturity.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { SessionService } from 'src/app/session/session.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

type State = {
    id: number;
    name: StateName;
    text: string;
    canProceed: boolean;
    warn: boolean;
    validate?: (exam: Exam) => boolean;
    showHint?: (exam: Exam) => boolean;
    hint?: (exam: Exam) => string;
    alternateState?: StateName;
};
export enum StateName {
    NOT_REVIEWED,
    REJECT_STRAIGHTAWAY,
    LANGUAGE_INSPECT,
    AWAIT_INSPECTION,
    REJECT_LANGUAGE,
    APPROVE_LANGUAGE,
    MISSING_STATEMENT,
}
type States = {
    [key in StateName]: State;
};

@Injectable({ providedIn: 'root' })
export class MaturityService {
    constructor(
        private http: HttpClient,
        private router: Router,
        private translate: TranslateService,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private Assessment: AssessmentService,
        private Session: SessionService,
    ) {}

    isMissingStatement = (exam: Exam) => {
        if (!this.isUnderLanguageInspection(exam)) {
            return !exam.examFeedback?.comment;
        }
        return !exam.languageInspection?.statement?.comment;
    };
    canFinalizeInspection = (exam: Exam): boolean =>
        exam.languageInspection?.statement?.comment ? exam.languageInspection.statement.comment.length > 0 : false;

    resolveHint = (exam: Exam) => {
        if (!this.isGraded(exam) && this.isMissingStatement(exam)) {
            return `${this.translate.instant('i18n_not_reviewed')}, ${this.translate.instant(
                'i18n_missing_content_statement',
            )}`;
        } else if (this.isGraded(exam) && this.isMissingStatement(exam)) {
            return this.translate.instant('i18n_missing_content_statement');
        } else if (!this.isMissingStatement(exam) && !this.isGraded(exam)) {
            return this.translate.instant('i18n_not_reviewed');
        }
        return '';
    };

    // eslint-disable-next-line @typescript-eslint/member-ordering
    MATURITY_STATES: States = {
        [StateName.NOT_REVIEWED]: {
            id: 1,
            text: 'i18n_not_reviewed',
            name: StateName.NOT_REVIEWED,
            canProceed: false,
            warn: false,
            showHint: (exam) => !this.isGraded(exam),
            hint: this.resolveHint,
        },
        [StateName.REJECT_STRAIGHTAWAY]: {
            id: 2,
            text: 'i18n_reject_maturity',
            name: StateName.REJECT_STRAIGHTAWAY,
            canProceed: true,
            warn: true,
        },
        [StateName.LANGUAGE_INSPECT]: {
            id: 3,
            text: 'i18n_send_for_language_inspection',
            name: StateName.LANGUAGE_INSPECT,
            canProceed: true,
            warn: false,
        },
        [StateName.AWAIT_INSPECTION]: {
            id: 4,
            text: 'i18n_await_inspection',
            name: StateName.AWAIT_INSPECTION,
            canProceed: false,
            warn: false,
        },
        [StateName.REJECT_LANGUAGE]: {
            id: 5,
            text: 'i18n_reject_maturity',
            name: StateName.REJECT_LANGUAGE,
            canProceed: true,
            warn: true,
            validate: this.canFinalizeInspection,
            showHint: this.isMissingStatement,
            hint: () => 'i18n_missing_statement',
        },
        [StateName.APPROVE_LANGUAGE]: {
            id: 6,
            text: 'i18n_approve_maturity',
            name: StateName.APPROVE_LANGUAGE,
            canProceed: true,
            warn: false,
            validate: this.canFinalizeInspection,
            showHint: this.isMissingStatement,
            hint: () => 'i18n_missing_statement',
            alternateState: StateName.REJECT_LANGUAGE,
        },
        [StateName.MISSING_STATEMENT]: {
            id: 9,
            text: 'i18n_missing_statement',
            name: StateName.MISSING_STATEMENT,
            canProceed: false,
            warn: false,
            showHint: this.isMissingStatement,
            hint: this.resolveHint,
        },
    };

    isMissingFeedback = (exam: Exam) => !exam.examFeedback || !exam.examFeedback.comment;

    isAwaitingInspection = (exam: Exam) => exam.languageInspection && !exam.languageInspection.finishedAt;

    isGraded = (exam: Exam) => exam.grade || exam.gradeless;

    saveInspectionStatement$ = (exam: Exam) => {
        const inspection = exam.languageInspection as LanguageInspection;
        const statement = {
            id: inspection.id,
            comment: inspection.statement.comment,
        };
        return this.http
            .put<LanguageInspection>(`/app/inspection/${inspection.id}/statement`, statement)
            .pipe(tap((li) => Object.assign(exam.languageInspection?.statement, { id: li.id })));
    };

    getNextState = (exam: Exam): State => {
        return this.MATURITY_STATES[this.getNextStateName(exam)];
    };

    getState = (state?: StateName): State => {
        if (!state) {
            throw Error('no state name provided!');
        }
        return this.MATURITY_STATES[state];
    };

    proceed = (exam: Exam, alternate: boolean) => {
        let state = this.getNextStateName(exam);
        if (this.MATURITY_STATES[state].alternateState && alternate) {
            state = this.MATURITY_STATES[state].alternateState as StateName;
        }
        switch (state) {
            case StateName.REJECT_STRAIGHTAWAY:
                this.Assessment.rejectMaturity$(exam).subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_maturity_rejected'));
                    const state = this.Assessment.getExitState(exam);
                    this.router.navigate(state.fragments, state.params);
                });
                break;
            case StateName.LANGUAGE_INSPECT:
                this.sendForLanguageInspection(exam);
                break;
            case StateName.REJECT_LANGUAGE:
                this.finalizeLanguageInspection(exam, true);
                break;
            case StateName.APPROVE_LANGUAGE:
                this.finalizeLanguageInspection(exam, false);
                break;
            case StateName.AWAIT_INSPECTION:
            default:
                // Nothing to do
                break;
        }
    };

    private isUnderLanguageInspection = (exam: Exam) =>
        this.Session.getUser().isLanguageInspector && exam.languageInspection && !exam.languageInspection.finishedAt;

    private getNextStateName = (exam: Exam): StateName => {
        if (!this.isGraded(exam)) {
            return StateName.NOT_REVIEWED;
        }
        if (this.isMissingFeedback(exam)) {
            return StateName.MISSING_STATEMENT;
        }
        if (this.isUnderLanguageInspection(exam)) {
            return StateName.APPROVE_LANGUAGE;
        }
        if (this.isAwaitingInspection(exam)) {
            return StateName.AWAIT_INSPECTION;
        }
        const grade = exam.grade;
        const disapproved = (!grade && !exam.gradeless) || grade?.marksRejection;

        return disapproved ? StateName.REJECT_STRAIGHTAWAY : StateName.LANGUAGE_INSPECT;
    };

    private sendForLanguageInspection = (exam: Exam) =>
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_maturity_approval'),
        )
            .pipe(
                switchMap(() => this.Assessment.saveFeedback$(exam)),
                switchMap(() => this.http.put(`app/review/${exam.id}`, this.Assessment.getPayload(exam, 'GRADED'))),
                switchMap(() => this.http.post('/app/inspection', { examId: exam.id })),
                catchError((err) => {
                    this.toast.error(err.data);
                    return throwError(() => new Error(err));
                }),
            )
            .subscribe(() => {
                this.toast.info(this.translate.instant('i18n_sent_for_language_inspection'));
                const state = this.Assessment.getExitState(exam);
                this.router.navigate(state.fragments, state.params);
            });

    private finalizeLanguageInspection = (exam: Exam, reject: boolean) => {
        this.Confirmation.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_confirm_language_inspection_approval'),
        )
            .pipe(
                switchMap(() => this.saveInspectionStatement$(exam)),
                switchMap(() =>
                    this.http.put(`/app/inspection/${exam.languageInspection?.id}/approval`, { approved: !reject }),
                ),
                switchMap(() =>
                    exam.parent?.examFeedbackConfig
                        ? this.Assessment.doesPreviouslyLockedAssessmentsExist$(exam)
                        : of({ status: 'nothing' }),
                ),
                switchMap(
                    (setting) =>
                        reject
                            ? this.Assessment.rejectMaturity$(exam, false)
                            : this.Assessment.createExamRecord$(exam, false, setting.status === 'everything'), // TODO: is this necessary with private examinations?
                ),
            )
            .subscribe(() => {
                if (reject) {
                    this.toast.info(this.translate.instant('i18n_maturity_rejected'));
                    this.router.navigate(['/staff/inspections']);
                } else {
                    this.toast.info(this.translate.instant('i18n_review_recorded'));
                    this.router.navigate(['/staff/inspections']);
                }
            });
    };
}
