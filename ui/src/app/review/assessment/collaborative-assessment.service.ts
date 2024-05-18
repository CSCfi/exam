// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Exam, ExamParticipation, Feedback, SelectableGrade } from 'src/app/exam/exam.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { AssessmentService } from './assessment.service';

interface Payload {
    id: number;
    state: string;
    grade?: SelectableGrade;
    gradeless: boolean;
    customCredit: number;
    creditType?: { type: string };
    answerLanguage?: string;
    additionalInfo: string;
    rev: string;
}

@Injectable({ providedIn: 'root' })
export class CollaborativeAssesmentService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private router: Router,
        private toast: ToastrService,
        private dialogs: ConfirmationDialogService,
        private Assessment: AssessmentService,
    ) {}

    saveAssessmentInfo$ = (
        examId: number,
        examRef: string,
        participation: ExamParticipation,
    ): Observable<ExamParticipation> => {
        if (participation.exam.state === 'GRADED_LOGGED') {
            const url = `/app/iop/reviews/${examId}/${examRef}/info`;
            return this.http.put<{ rev: string }>(url, { assessmentInfo: participation.exam.assessmentInfo }).pipe(
                tap(() => this.toast.info(this.translate.instant('i18n_saved'))),
                map((data) => {
                    participation._rev = data.rev;
                    return participation;
                }),
            );
        }
        return of(participation);
    };

    sendEmailMessage$ = (examId: number, examRef: string, message: string): Observable<void> => {
        const url = `/app/iop/reviews/${examId}/${examRef}/mail`;
        return this.http.post<void>(url, { msg: message });
    };

    saveFeedback$(examId: number, examRef: string, participation: ExamParticipation): Observable<ExamParticipation> {
        const payload = {
            rev: participation._rev,
            comment: participation.exam.examFeedback?.comment,
        };
        const url = `/app/iop/reviews/${examId}/${examRef}/comment`;
        return this.http.put<{ rev: string }>(url, payload).pipe(
            tap(() => this.toast.info(this.translate.instant('i18n_comment_added'))),
            map((data) => {
                participation._rev = data.rev;
                return participation;
            }),
        );
    }

    getPayload(exam: Exam, state: string, rev: string): Payload {
        return {
            id: exam.id,
            state: state || exam.state,
            grade: exam.gradeless ? undefined : exam.grade,
            gradeless: exam.gradeless,
            customCredit: exam.customCredit,
            creditType: exam.creditType,
            answerLanguage: exam.answerLanguage,
            additionalInfo: exam.additionalInfo,
            rev: rev,
        };
    }

    saveAssessment = (participation: ExamParticipation, modifiable: boolean, id: number, ref: string) => {
        if (!modifiable) {
            if (participation.exam.state !== 'GRADED') {
                // Just save feedback and leave
                this.saveFeedback$(id, ref, participation).subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_saved'));
                    const state = this.Assessment.getExitStateById(id, true);
                    this.router.navigate(state.fragments, { queryParams: state.params });
                });
            }
        } else {
            if (!this.Assessment.checkCredit(participation.exam)) {
                return;
            }
            const messages = this.Assessment.getErrors(participation.exam);
            const oldState = participation.exam.state;
            const newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';
            const payload = this.getPayload(participation.exam, newState, participation._rev as string);
            if (newState !== 'GRADED' || oldState === 'GRADED') {
                this.sendAssessment(newState, payload, messages, participation, id, ref);
            } else {
                const dialog = this.dialogs.open$(
                    this.translate.instant('i18n_confirm'),
                    this.translate.instant('i18n_confirm_grade_review'),
                );
                dialog.subscribe({
                    next: () => this.sendAssessment(newState, payload, messages, participation, id, ref),
                    error: (err) => this.toast.error(err),
                });
            }
        }
    };

    createExamRecord = (participation: ExamParticipation, examId: number, ref: string) => {
        if (!this.Assessment.checkCredit(participation.exam)) {
            return;
        }
        const messages = this.Assessment.getErrors(participation.exam);
        if (messages.length > 0) {
            messages.forEach((msg) => this.toast.error(this.translate.instant(msg)));
        } else {
            const dialogNote = participation.exam.gradeless
                ? this.translate.instant('i18n_confirm_archiving_without_grade')
                : this.Assessment.getRecordReviewConfirmationDialogContent(
                      (participation.exam.examFeedback as Feedback).comment,
                      false,
                  );
            const payload = this.getPayload(participation.exam, 'GRADED', participation._rev as string);
            this.dialogs.open$(this.translate.instant('i18n_confirm'), dialogNote).subscribe({
                next: () => this.register(participation, examId, ref, payload),
                error: (err) => this.toast.error(err),
            });
        }
    };

    private sendAssessment = (
        newState: string,
        payload: Payload,
        messages: string[],
        participation: ExamParticipation,
        examId: number,
        examRef: string,
    ) => {
        const url = `/app/iop/reviews/${examId}/${examRef}`;
        this.http.put<{ rev: string }>(url, payload).subscribe({
            next: (data) => {
                participation._rev = data.rev;
                this.saveFeedback$(examId, examRef, participation).subscribe({
                    next: () => {
                        if (newState === 'REVIEW_STARTED') {
                            messages.forEach((msg) => this.toast.warning(this.translate.instant(msg)));
                            window.setTimeout(() => this.toast.info(this.translate.instant('i18n_review_saved')), 1000);
                        } else {
                            this.toast.info(this.translate.instant('i18n_review_graded'));
                            const state = this.Assessment.getExitStateById(examId, true);
                            this.router.navigate(state.fragments, { queryParams: state.params });
                        }
                    },
                    error: (err) => this.toast.error(err),
                });
            },
            error: (err) => this.toast.error(err),
        });
    };

    private sendToRegistry = (payload: Payload, examId: number, ref: string, participation: ExamParticipation) => {
        payload.state = 'GRADED_LOGGED';
        const url = `/app/iop/reviews/${examId}/${ref}/record`;
        this.http.put<{ rev: string }>(url, payload).subscribe({
            next: (data) => {
                participation._rev = data.rev;
                this.toast.info(this.translate.instant('i18n_review_recorded'));
                const state = this.Assessment.getExitStateById(examId, true);
                this.router.navigate(state.fragments, { queryParams: state.params });
            },
            error: (err) => this.toast.error(err),
        });
    };

    private register = (participation: ExamParticipation, examId: number, ref: string, payload: Payload) => {
        this.saveFeedback$(examId, ref, participation).subscribe({
            next: () => {
                payload.rev = participation._rev as string;
                const url = `/app/iop/reviews/${examId}/${ref}`;
                this.http.put<{ rev: string }>(url, payload).subscribe({
                    next: (data) => {
                        payload.rev = participation._rev = data.rev;
                        if (participation.exam.state !== 'GRADED') {
                            this.toast.info(this.translate.instant('i18n_review_graded'));
                        }
                        this.sendToRegistry(payload, examId, ref, participation);
                    },
                    error: (err) => this.toast.error(err),
                });
            },
            error: (err) => this.toast.error(err),
        });
    };
}
