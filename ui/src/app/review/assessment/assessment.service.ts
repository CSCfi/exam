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
import { Point } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import type { ReviewedExam } from '../../enrolment/enrolment.model';
import type { Exam, ExamLanguage, ExamSectionQuestion, Feedback } from '../../exam/exam.model';
import { isRealGrade } from '../../exam/exam.model';
import { SessionService } from '../../session/session.service';
import { ConfirmationDialogService } from '../../shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from '../../shared/miscellaneous/common-exam.service';

type Payload = {
    id: number;
    state: string;
    grade?: number;
    gradeless: boolean;
    customCredit: number;
    creditType?: string;
    answerLanguage?: string;
    additionalInfo: string;
};

export type Link = {
    fragments: string[];
    params?: { [key: string]: unknown };
};

@Injectable({ providedIn: 'root' })
export class AssessmentService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private router: Router,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private Session: SessionService,
        private Exam: CommonExamService,
    ) {}

    saveFeedback$ = (exam: Exam, silent = false): Observable<Feedback> => {
        const data = {
            id: exam.examFeedback?.id,
            comment: exam.examFeedback?.comment,
        };
        return this.http.put<Feedback>(`/app/review/${exam.id}/comment`, data).pipe(
            tap((comment) => {
                if (!silent) {
                    this.toast.info(this.translate.instant('i18n_comment_updated'));
                }
                Object.assign(exam.examFeedback, { id: comment.id });
            }),
        );
    };

    isReadOnly = (exam: Exam) => ['GRADED_LOGGED', 'ARCHIVED', 'ABORTED', 'REJECTED'].indexOf(exam?.state) > -1;
    isGraded = (exam: Exam) => exam?.state === 'GRADED';

    pickExamLanguage = (exam: Exam): ExamLanguage | null => {
        const lang = exam.answerLanguage;
        if (lang) {
            return { code: lang, name: '' };
        } else if (exam.examLanguages.length === 1) {
            return exam.examLanguages[0];
        }
        return null;
    };

    checkCredit<T extends Exam>(exam: T, silent = false) {
        const valid = this.Exam.hasCustomCredit(exam);
        if (!valid) {
            if (!silent) {
                this.toast.error(this.translate.instant('i18n_not_a_valid_custom_credit'));
            }
            // Reset to default
            exam.customCredit = exam.course ? exam.course.credits : 0;
        }
        return valid;
    }

    // Defining markup outside templates is not advisable, but creating a working custom dialog template for this
    // proved to be a bit too much of a hassle. Lets live with this.
    getRecordReviewConfirmationDialogContent = (feedback: string, showFeedbackConfigWarning: boolean) => {
        const feedbackContent = feedback
            ? `<h4>${this.translate.instant('i18n_teachers_comment')}</h4> ${feedback}`
            : '';
        const content = `${feedbackContent}<p>${this.translate.instant('i18n_confirm_record_review')}</p>`;
        if (showFeedbackConfigWarning) {
            return `${content}<p>${this.translate.instant('i18n_exam_feedback_config_warning')}</p>`;
        }
        return content;
    };

    getExitStateById = (id: number, collaborative: boolean): Link => {
        return {
            fragments: ['/staff/exams', id.toString(), '5'],
            params: { collaborative: collaborative },
        };
    };

    getExitState = (exam: Exam, collaborative = false): Link => {
        const user = this.Session.getUser();
        if (user && user.isAdmin) {
            return { fragments: ['/staff/admin'] };
        }
        const id = exam.parent ? exam.parent.id : exam.id;
        return this.getExitStateById(id, collaborative);
    };

    createExamRecord$ = (exam: Exam, needsConfirmation: boolean, needsWarning: boolean): Observable<void> => {
        if (!this.checkCredit(exam)) {
            return of();
        }
        const messages = this.getErrors(exam);
        if (messages.length > 0) {
            messages.forEach((msg) => this.toast.error(this.translate.instant(msg)));
            return of();
        } else {
            const content = exam.gradeless
                ? this.translate.instant('i18n_confirm_archiving_without_grade')
                : this.getRecordReviewConfirmationDialogContent((exam.examFeedback as Feedback).comment, needsWarning);
            const resource = exam.gradeless ? '/app/exam/register' : '/app/exam/record';
            const payload = this.getPayload(exam, 'GRADED');
            if (needsConfirmation) {
                return this.Confirmation.open$(this.translate.instant('i18n_confirm'), content).pipe(
                    switchMap(() => this.register$(exam, resource, payload)),
                );
            } else {
                return this.sendToRegistry$(payload, resource);
            }
        }
    };

    doesPreviouslyLockedAssessmentsExist$ = (exam: Exam) => {
        if (!exam.parent?.id || !exam.parent.examFeedbackConfig) {
            return of({ status: 'nothing' });
        }
        return this.http.get<{ status: 'nothing' | 'everything' }>(`/app/review/${exam.parent.id}/locked`);
    };

    isCommentRead = (exam: Exam | ReviewedExam) => exam.examFeedback && exam.examFeedback.feedbackStatus;

    saveEssayScore$ = (question: ExamSectionQuestion): Observable<void> => {
        if (!question.essayAnswer || isNaN(question.essayAnswer?.evaluatedScore as number)) {
            return throwError(() => new Error(this.translate.instant('i18n_error_score_input')));
        }
        const url = `/app/review/examquestion/${question.id}/score`;
        return this.http.put<void>(url, { evaluatedScore: question.essayAnswer.evaluatedScore });
    };

    saveCollaborativeEssayScore$ = (
        question: ExamSectionQuestion,
        examId: number,
        examRef: string,
        rev: string,
    ): Observable<{ rev: string }> => {
        if (!question.essayAnswer || isNaN(question.essayAnswer?.evaluatedScore as number)) {
            return throwError(() => new Error(this.translate.instant('i18n_error_score_input')));
        }
        const url = `/app/iop/reviews/${examId}/${examRef}/question/${question.id}`;
        return this.http.put<{ rev: string }>(url, { evaluatedScore: question.essayAnswer.evaluatedScore, rev: rev });
    };

    saveAssessmentInfo$ = (exam: Exam): Observable<void> => {
        if (exam.state === 'GRADED_LOGGED' || exam.state === 'ARCHIVED') {
            return this.http
                .put<void>(`/app/review/${exam.id}/info`, { assessmentInfo: exam.assessmentInfo })
                .pipe(tap(() => this.toast.info(this.translate.instant('i18n_saved'))));
        }
        return of();
    };

    saveAssessment = (exam: Exam, modifiable: boolean) => {
        if (!modifiable) {
            if (exam.state !== 'GRADED') {
                // Just save feedback and leave
                this.saveFeedback$(exam).subscribe(() => {
                    this.toast.info(this.translate.instant('i18n_saved'));
                    const state = this.getExitState(exam);
                    this.router.navigate(state.fragments, { queryParams: state.params });
                });
            }
        } else {
            if (!this.checkCredit(exam)) {
                return;
            }
            const messages = this.getErrors(exam);
            if (exam.executionType.type === 'MATURITY') {
                this.sendAssessment(exam.state, this.getPayload(exam), messages, exam);
            } else {
                const oldState = exam.state;
                const newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';
                const payload = this.getPayload(exam, newState);
                if (newState !== 'GRADED' || oldState === 'GRADED') {
                    this.sendAssessment(newState, payload, messages, exam);
                } else {
                    this.Confirmation.open$(
                        this.translate.instant('i18n_confirm'),
                        this.translate.instant('i18n_confirm_grade_review'),
                    ).subscribe(() => this.sendAssessment(newState, payload, messages, exam));
                }
            }
        }
    };

    saveForcedScore = (question: ExamSectionQuestion) => {
        const url = `/app/review/examquestion/${question.id}/score/force`;
        return this.http.put<void>(url, { forcedScore: question.forcedScore });
    };
    saveCollaborativeForcedScore$ = (question: ExamSectionQuestion, examId: number, examRef: string, rev: string) => {
        const url = `/app/iop/reviews/${examId}/${examRef}/question/${question.id}/force`;
        return this.http.put<{ rev: string }>(url, { forcedScore: question.forcedScore, rev: rev });
    };

    rejectMaturity$ = (exam: Exam, askConfirmation = false): Observable<void> => {
        const reject: Observable<void> = this.saveFeedback$(exam).pipe(
            switchMap(() => this.http.put<void>(`/app/review/${exam.id}`, this.getPayload(exam, 'REJECTED'))),
        );

        if (askConfirmation) {
            return this.Confirmation.open$(
                this.translate.instant('i18n_confirm'),
                this.translate.instant('i18n_confirm_maturity_disapproval'),
            ).pipe(switchMap(() => reject));
        } else {
            return reject;
        }
    };

    getPayload = (exam: Exam, state?: string): Payload => ({
        id: exam.id,
        state: state || exam.state,
        grade: exam.grade && isRealGrade(exam.grade) ? exam.grade.id : undefined,
        gradeless: exam.gradeless,
        customCredit: exam.customCredit,
        creditType: exam.creditType ? exam.creditType.type : undefined,
        answerLanguage: exam.answerLanguage,
        additionalInfo: exam.additionalInfo,
    });

    sendAssessment = (newState: string, payload: Payload, messages: string[], exam: Exam) => {
        this.http
            .put(`/app/review/${exam.id}`, payload)
            .pipe(
                switchMap(() => this.saveFeedback$(exam)),
                tap(() => {
                    if (newState === 'REVIEW_STARTED') {
                        messages.forEach((msg) => this.toast.warning(this.translate.instant(msg)));
                        window.setTimeout(() => this.toast.info(this.translate.instant('i18n_review_saved')), 1000);
                    } else {
                        this.toast.info(this.translate.instant('i18n_review_graded'));
                        const state = this.getExitState(exam);
                        this.router.navigate(state.fragments, { queryParams: state.params });
                    }
                }),
                catchError(async (resp) => this.toast.error(resp)),
            )
            .subscribe();
    };

    getErrors = (exam: Exam) => {
        const messages: string[] = [];
        if (!exam.grade?.id && !exam.gradeless) {
            messages.push('i18n_participation_unreviewed');
        }
        if (!exam.creditType?.type) {
            messages.push('i18n_exam_choose_credit_type');
        }
        if (!exam.answerLanguage) {
            messages.push('i18n_exam_choose_response_language');
        }
        return messages;
    };

    sendToRegistry$ = (payload: Payload, res: string): Observable<void> =>
        this.http.post<void>(res, { ...payload, state: 'GRADED_LOGGED' });

    register$ = (exam: Exam, res: string, payload: Payload): Observable<void> => {
        return this.saveFeedback$(exam).pipe(
            switchMap(() => this.http.put(`/app/review/${exam.id}`, payload)),
            tap(() => {
                if (exam.state !== 'GRADED') {
                    this.toast.info(this.translate.instant('i18n_review_graded'));
                }
            }),
            switchMap(() => this.sendToRegistry$(payload, res)),
        );
    };

    fixPosition = (pos: Point): Point => {
        const vpw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vph = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        return { x: Math.min(Math.max(pos.x, 0), vpw - 30), y: Math.min(Math.max(pos.y, 0), vph - 30) };
    };
}
