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
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import * as toast from 'toastr';

import { Exam } from '../../../exam/exam.model';
import { LanguageInspection } from '../../../maturity/maturity.model';
import { SessionService } from '../../../session/session.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { AssessmentService } from '../assessment.service';

type State = {
    id: number;
    text: string;
    canProceed: boolean;
    warn: boolean;
    validate?: (exam: Exam) => boolean;
    showHint?: (exam: Exam) => boolean;
    hint?: string;
    alternateState?: StateName;
};
enum StateName {
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

@Injectable()
export class MaturityService {
    isMissingStatement = (exam: Exam) => {
        if (!this.isUnderLanguageInspection(exam)) {
            return false;
        }
        return !exam.languageInspection?.statement.comment;
    };
    private canFinalizeInspection = (exam: Exam) => typeof exam.languageInspection?.statement.comment === 'string';

    MATURITY_STATES: States = {
        [StateName.NOT_REVIEWED]: { id: 1, text: 'sitnet_not_reviewed', canProceed: false, warn: false },
        [StateName.REJECT_STRAIGHTAWAY]: { id: 2, text: 'sitnet_reject_maturity', canProceed: true, warn: true },
        [StateName.LANGUAGE_INSPECT]: {
            id: 3,
            text: 'sitnet_send_for_language_inspection',
            canProceed: true,
            warn: false,
        },
        [StateName.AWAIT_INSPECTION]: { id: 4, text: 'sitnet_await_inspection', canProceed: false, warn: false },
        [StateName.REJECT_LANGUAGE]: {
            id: 5,
            text: 'sitnet_reject_maturity',
            canProceed: true,
            warn: true,
            validate: this.canFinalizeInspection,
            showHint: this.isMissingStatement,
            hint: 'sitnet_missing_statement',
        },
        [StateName.APPROVE_LANGUAGE]: {
            id: 6,
            text: 'sitnet_approve_maturity',
            canProceed: true,
            warn: false,
            validate: this.canFinalizeInspection,
            showHint: this.isMissingStatement,
            hint: 'sitnet_missing_statement',
            alternateState: StateName.REJECT_LANGUAGE,
        },
        [StateName.MISSING_STATEMENT]: { id: 9, text: 'sitnet_missing_statement', canProceed: false, warn: false },
    };

    constructor(
        private http: HttpClient,
        private location: Location,
        private translate: TranslateService,
        private Confirmation: ConfirmationDialogService,
        private Assessment: AssessmentService,
        private Session: SessionService,
    ) {}

    private isUnderLanguageInspection = (exam: Exam) =>
        this.Session.getUser().isLanguageInspector && exam.languageInspection && !exam.languageInspection.finishedAt;

    isMissingFeedback = (exam: Exam) => !exam.examFeedback || !exam.examFeedback.comment;

    isAwaitingInspection = (exam: Exam) => exam.languageInspection && !exam.languageInspection.finishedAt;

    isGraded = (exam: Exam) => exam.grade;

    saveInspectionStatement$ = (exam: Exam) => {
        const inspection = exam.languageInspection as LanguageInspection;
        const statement = {
            id: inspection.id,
            comment: inspection.statement.comment,
        };
        return this.http.put<LanguageInspection>(`/app/inspection/${exam.id}/statement`, statement);
    };

    getNextState = (exam: Exam): StateName => {
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
        const disapproved = !grade || grade.marksRejection;

        return disapproved ? StateName.REJECT_STRAIGHTAWAY : StateName.LANGUAGE_INSPECT;
    };

    proceed = (exam: Exam, alternate: boolean) => {
        let state = this.getNextState(exam);
        if (this.MATURITY_STATES[state].alternateState && alternate) {
            state = this.MATURITY_STATES[state].alternateState as StateName;
        }
        switch (state) {
            case StateName.REJECT_STRAIGHTAWAY:
                this.Assessment.rejectMaturity$(exam).subscribe(() => {
                    toast.info(this.translate.instant('sitnet_maturity_rejected'));
                    this.location.go(this.Assessment.getExitUrl(exam));
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

    private sendForLanguageInspection = (exam: Exam) =>
        of(
            this.Confirmation.open(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_confirm_maturity_approval'),
            ),
        )
            .pipe(
                switchMap(() => this.Assessment.saveFeedback$(exam)),
                switchMap(() => this.http.put(`app/review/${exam.id}`, this.Assessment.getPayload(exam, 'GRADED'))),
                switchMap(() => this.http.post('/app/inspection', { examId: exam.id })),
                catchError(err => {
                    toast.error(err.data);
                    return throwError(err);
                }),
            )
            .subscribe(() => {
                toast.info(this.translate.instant('sitnet_sent_for_language_inspection'));
                this.location.go(this.Assessment.getExitUrl(exam));
            });

    private finalizeLanguageInspection = (exam: Exam, reject: boolean) => {
        of(
            this.Confirmation.open(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_confirm_language_inspection_approval'),
            ),
        )
            .pipe(
                switchMap(() => this.saveInspectionStatement$(exam)),
                switchMap(() => this.http.put(`/app/inspection/${exam.id}/approval`, { approved: !reject })),
                switchMap(() =>
                    reject
                        ? this.Assessment.rejectMaturity$(exam, false)
                        : this.Assessment.createExamRecord$(exam, false),
                ),
            )
            .subscribe(() => {
                if (reject) {
                    toast.info(this.translate.instant('sitnet_maturity_rejected'));
                    this.location.go('/inscpections');
                } else {
                    toast.info(this.translate.instant('sitnet_review_recorded'));
                    this.location.go('/inspections');
                }
            });
    };
}
