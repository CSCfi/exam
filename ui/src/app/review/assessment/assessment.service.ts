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
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { StateDeclaration } from '@uirouter/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from, noop, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import type { ReviewedExam } from '../../enrolment/enrolment.model';
import type { Exam, ExamLanguage, ExamSectionQuestion, Feedback } from '../../exam/exam.model';
import { isRealGrade } from '../../exam/exam.model';
import { SessionService } from '../../session/session.service';
import { ConfirmationDialogService } from '../../shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from '../../shared/miscellaneous/common-exam.service';
import { WindowRef } from '../../shared/window/window.service';

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

@Injectable()
export class AssessmentService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private state: StateService,
        private routing: UIRouterGlobals,
        @Inject(DOCUMENT) private document: Document,
        private toast: ToastrService,
        private windowRef: WindowRef,
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
                    this.toast.info(this.translate.instant('sitnet_comment_updated'));
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
                this.toast.error(this.translate.instant('sitnet_not_a_valid_custom_credit'));
            }
            // Reset to default
            exam.customCredit = exam.course ? exam.course.credits : 0;
        }
        return valid;
    }

    // Defining markup outside templates is not advisable, but creating a working custom dialog template for this
    // proved to be a bit too much of a hassle. Lets live with this.
    getRecordReviewConfirmationDialogContent = (feedback: string) =>
        `<h4>${this.translate.instant('sitnet_teachers_comment')}</h4>
        ${feedback}<br/>
        <strong>${this.translate.instant('sitnet_confirm_record_review')}</strong>
        `;

    countCharacters = (text?: string) => {
        let normalizedText = text
            ? text
                  .replace(/\s/g, '')
                  .replace(/&nbsp;/g, '')
                  .replace(/(\r\n|\n|\r)/gm, '')
                  .replace(/&nbsp;/gi, ' ')
            : '';
        normalizedText = this.strip(normalizedText).replace(/^([\t\r\n]*)$/, '');
        return normalizedText.length;
    };

    private strip = (html: string) => {
        const tmp = this.document.createElement('div');
        tmp.innerHTML = html;
        if (!tmp.textContent && typeof tmp.innerText === 'undefined') {
            return '';
        }
        return tmp.textContent || tmp.innerText;
    };

    countWords = (text?: string) => {
        let normalizedText = text
            ? text
                  .replace(/(\r\n|\n|\r)/gm, ' ')
                  .replace(/^\s+|\s+$/g, '')
                  .replace('&nbsp;', ' ')
            : '';
        normalizedText = this.strip(normalizedText);
        const words = normalizedText.split(/\s+/);
        for (let wordIndex = words.length - 1; wordIndex >= 0; wordIndex--) {
            if (words[wordIndex].match(/^([\s\t\r\n]*)$/)) {
                words.splice(wordIndex, 1);
            }
        }
        return words.length;
    };

    getExitStateById = (id: number, collaborative: boolean): StateDeclaration => {
        return {
            name: 'staff.examEditor.assessments',
            params: { collaborative: collaborative ? 'collaborative' : 'regular', id: id },
        };
    };

    getExitState = (exam: Exam, collaborative = false): StateDeclaration => {
        const user = this.Session.getUser();
        if (user && user.isAdmin) {
            return { name: 'staff.admin' };
        }
        const id = exam.parent ? exam.parent.id : this.routing.params.id;
        return this.getExitStateById(id, collaborative);
    };

    createExamRecord$ = (exam: Exam, needsConfirmation: boolean): Observable<void> => {
        if (!this.checkCredit(exam)) {
            return of();
        }
        const messages = this.getErrors(exam);
        if (messages.length > 0) {
            messages.forEach((msg) => this.toast.error(this.translate.instant(msg)));
            return of();
        } else {
            let dialogNote, res: string;
            if (exam.gradeless) {
                dialogNote = this.translate.instant('sitnet_confirm_archiving_without_grade');
                res = '/app/exam/register';
            } else {
                dialogNote = this.getRecordReviewConfirmationDialogContent((exam.examFeedback as Feedback).comment);
                res = '/app/exam/record';
            }
            const payload = this.getPayload(exam, 'GRADED');
            if (needsConfirmation) {
                const dialog = this.Confirmation.open(this.translate.instant('sitnet_confirm'), dialogNote);
                return from(dialog.result).pipe(switchMap(() => this.register$(exam, res, payload)));
            } else {
                return this.sendToRegistry$(payload, res);
            }
        }
    };

    isCommentRead = (exam: Exam | ReviewedExam) => exam.examFeedback && exam.examFeedback.feedbackStatus;

    saveEssayScore$ = (question: ExamSectionQuestion): Observable<void> => {
        if (!question.essayAnswer || isNaN(question.essayAnswer?.evaluatedScore as number)) {
            return throwError(() => new Error(this.translate.instant('sitnet_error_score_input')));
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
            return throwError(() => new Error(this.translate.instant('sitnet_error_score_input')));
        }
        const url = `/app/iop/reviews/${examId}/${examRef}/question/${question.id}`;
        return this.http.put<{ rev: string }>(url, { evaluatedScore: question.essayAnswer.evaluatedScore, rev: rev });
    };

    saveAssessmentInfo$ = (exam: Exam): Observable<void> => {
        if (exam.state === 'GRADED_LOGGED' || exam.state === 'ARCHIVED') {
            return this.http
                .put<void>(`/app/review/${exam.id}/info`, { assessmentInfo: exam.assessmentInfo })
                .pipe(tap(() => this.toast.info(this.translate.instant('sitnet_saved'))));
        }
        return of();
    };

    saveAssessment = (exam: Exam, modifiable: boolean) => {
        if (!modifiable) {
            if (exam.state !== 'GRADED') {
                // Just save feedback and leave
                this.saveFeedback$(exam).subscribe(() => {
                    this.toast.info(this.translate.instant('sitnet_saved'));
                    const state = this.getExitState(exam);
                    this.state.go(state.name as string, state.params);
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
                    const dialog = this.Confirmation.open(
                        this.translate.instant('sitnet_confirm'),
                        this.translate.instant('sitnet_confirm_grade_review'),
                    );
                    dialog.result.then(() => this.sendAssessment(newState, payload, messages, exam)).catch(noop);
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
            return of(
                this.Confirmation.open(
                    this.translate.instant('sitnet_confirm'),
                    this.translate.instant('sitnet_confirm_maturity_disapproval'),
                ).result,
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
                        this.windowRef.nativeWindow.setTimeout(
                            () => this.toast.info(this.translate.instant('sitnet_review_saved')),
                            1000,
                        );
                    } else {
                        this.toast.info(this.translate.instant('sitnet_review_graded'));
                        const state = this.getExitState(exam);
                        this.state.go(state.name as string, state.params);
                    }
                }),
                catchError(async (resp) => this.toast.error(resp)),
            )
            .subscribe();
    };

    getErrors = (exam: Exam) => {
        const messages: string[] = [];
        if (!exam.grade?.id && !exam.gradeless) {
            messages.push('sitnet_participation_unreviewed');
        }
        if (!exam.creditType?.type) {
            messages.push('sitnet_exam_choose_credit_type');
        }
        if (!exam.answerLanguage) {
            messages.push('sitnet_exam_choose_response_language');
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
                    this.toast.info(this.translate.instant('sitnet_review_graded'));
                }
            }),
            switchMap(() => this.sendToRegistry$(payload, res)),
        );
    };
}
