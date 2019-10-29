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
import { DOCUMENT, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import isRealGrade, { Exam, ExamSectionQuestion, Feedback } from '../../exam/exam.model';
import { ExamService } from '../../exam/exam.service';
import { Examination, ExaminationQuestion } from '../../examination/examination.service';
import { SessionService } from '../../session/session.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { WindowRef } from '../../utility/window/window.service';

@Injectable()
export class AssessmentService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private location: Location,
        @Inject(DOCUMENT) private document: Document,
        private windowRef: WindowRef,
        private Confirmation: ConfirmationDialogService,
        private Session: SessionService,
        private Exam: ExamService,
    ) {}

    saveFeedback$ = (exam: Examination, silent = false): Observable<Examination> => {
        const data = {
            id: exam.examFeedback.id,
            comment: exam.examFeedback.comment,
        };
        return this.http.put<Feedback>(`/app/review/${exam.id}/comment`, data).pipe(
            tap(() => {
                if (!silent) {
                    toast.info(this.translate.instant('sitnet_comment_updated'));
                }
            }),
            map(feedback => {
                exam.examFeedback = feedback;
                return exam;
            }),
        );
    };

    isReadOnly = (exam: Examination) => ['GRADED_LOGGED', 'ARCHIVED', 'ABORTED', 'REJECTED'].indexOf(exam.state) > -1;
    isGraded = (exam: Examination) => exam.state === 'GRADED';

    pickExamLanguage = (exam: Examination): { code: string } => {
        const lang = exam.answerLanguage;
        if (lang) {
            return { code: lang };
        } else if (exam.examLanguages.length === 1) {
            return { code: exam.examLanguages[0].code };
        }
        throw Error('No Exam Language to pick!');
    };

    checkCredit<T extends Exam>(exam: T, silent = false) {
        const valid = this.Exam.hasCustomCredit(exam);
        if (!valid) {
            if (!silent) {
                toast.error(this.translate.instant('sitnet_not_a_valid_custom_credit'));
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

    countCharacters = (text: string) => {
        let normalizedText = text
            .replace(/\s/g, '')
            .replace(/&nbsp;/g, '')
            .replace(/(\r\n|\n|\r)/gm, '')
            .replace(/&nbsp;/gi, ' ');
        normalizedText = this.strip(normalizedText).replace(/^([\t\r\n]*)$/, '');
        return normalizedText.length;
    };

    private strip = html => {
        const tmp = this.document.createElement('div');
        tmp.innerHTML = html;
        if (!tmp.textContent && typeof tmp.innerText === 'undefined') {
            return '';
        }
        return tmp.textContent || tmp.innerText;
    };

    countWords = text => {
        let normalizedText = text
            .replace(/(\r\n|\n|\r)/gm, ' ')
            .replace(/^\s+|\s+$/g, '')
            .replace('&nbsp;', ' ');
        normalizedText = this.strip(normalizedText);
        const words = normalizedText.split(/\s+/);
        for (let wordIndex = words.length - 1; wordIndex >= 0; wordIndex--) {
            if (words[wordIndex].match(/^([\s\t\r\n]*)$/)) {
                words.splice(wordIndex, 1);
            }
        }
        return words.length;
    };

    getExitUrlById = (id: number, collaborative: boolean): string => {
        return collaborative ? `/exams/collaborative/${id}/4` : `/exams/${id}/4`;
    };

    getExitUrl = (exam: Examination, collaborative = false) => {
        const user = this.Session.getUser();
        if (user && user.isAdmin) {
            return '/';
        }
        const id = exam.parent ? exam.parent.id : exam.id; // CHECK THIS, need to get from URL!
        return this.getExitUrlById(id, collaborative);
    };

    createExamRecord$ = (exam: Examination, needsConfirmation: boolean, followUpUrl): Observable<void> => {
        if (!this.checkCredit(exam)) {
            return of();
        }
        const messages = this.getErrors(exam);
        if (messages.length > 0) {
            messages.forEach(msg => toast.error(this.translate.instant(msg)));
            return of();
        } else {
            let dialogNote, res;
            if (exam.gradeless) {
                dialogNote = this.translate.instant('sitnet_confirm_archiving_without_grade');
                res = '/app/exam/register';
            } else {
                dialogNote = this.getRecordReviewConfirmationDialogContent(exam.examFeedback.comment);
                res = '/app/exam/record';
            }
            const payload = this.getPayload(exam, 'GRADED');
            if (needsConfirmation) {
                const dialog = this.Confirmation.open(this.translate.instant('sitnet_confirm'), dialogNote);
                return from(dialog.result).pipe(switchMap(() => this.register$(exam, res, payload, followUpUrl)));
            } else {
                return this.sendToRegistry$(payload, res, exam, followUpUrl);
            }
        }
    };

    isCommentRead = (exam: Exam | Examination) => exam.examFeedback.feedbackStatus;

    setCommentRead = (exam: Exam | Examination) => {
        if (!this.isCommentRead(exam)) {
            const examFeedback = {
                feedbackStatus: true,
            };
            this.http
                .put<void>(`/app/review/${exam.id}/comment/:cid/feedbackstatus`, examFeedback)
                .subscribe(() => (exam.examFeedback.feedbackStatus = true));
        }
    };

    saveEssayScore = (question: ExaminationQuestion, examId, examRef, rev): Observable<{ data: any }> => {
        if (!question.essayAnswer || isNaN(question.essayAnswer.evaluatedScore)) {
            return of({ data: 'sitnet_error_score_input' });
        }
        const url =
            examId && examRef
                ? `/integration/iop/reviews/${examId}/${examRef}/question/${question.id}`
                : `/app/review/examquestion/${question.id}/score`;

        return this.http.put<{ data: any }>(url, { evaluatedScore: question.essayAnswer.evaluatedScore, rev: rev });
    };

    saveAssessmentInfo = (exam: Examination): Observable<void> => {
        if (exam.state === 'GRADED_LOGGED' || exam.state === 'ARCHIVED') {
            return this.http
                .put<void>(`/app/review/${exam.id}/info`, { assessmentInfo: exam.assessmentInfo })
                .pipe(tap(() => toast.info(this.translate.instant('sitnet_saved'))));
        }
        return of();
    };

    saveAssessment = (exam: Examination, modifiable) => {
        if (!modifiable) {
            if (exam.state !== 'GRADED') {
                // Just save feedback and leave
                this.saveFeedback$(exam).subscribe(() => {
                    toast.info(this.translate.instant('sitnet_saved'));
                    this.location.go(this.getExitUrl(exam));
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
                    dialog.result.then(() => this.sendAssessment(newState, payload, messages, exam));
                }
            }
        }
    };

    saveForcedScore = (question: ExamSectionQuestion, examId: number, examRef: string, rev: string) => {
        const url =
            examId && examRef
                ? `/integration/iop/reviews/${examId}/${examRef}/question/${question.id}/force`
                : `/app/review/examquestion/${question.id}/score/force`;
        return this.http.put(url, { forcedScore: question.forcedScore, rev: rev });
    };

    rejectMaturity = (exam: Examination, askConfirmation = false, followUpUrl?: string) => {
        const reject = () => {
            this.saveFeedback$(exam).subscribe(() => {
                const payload = this.getPayload(exam, 'REJECTED');
                this.http.put(`/app/review/${exam.id}`, payload).subscribe(
                    () => {
                        toast.info(this.translate.instant('sitnet_maturity_rejected'));
                        this.location.go(followUpUrl || this.getExitUrl(exam));
                    },
                    resp => toast.error(resp.error),
                );
            });
        };
        if (askConfirmation) {
            this.Confirmation.open(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_confirm_maturity_disapproval'),
            ).result.then(() => reject());
        } else {
            reject();
        }
    };

    getPayload = (exam: Examination, state?: string) => ({
        id: exam.id,
        state: state || exam.state,
        grade: exam.grade && isRealGrade(exam.grade) ? exam.grade.id : undefined,
        gradeless: exam.gradeless,
        customCredit: exam.customCredit,
        creditType: exam.creditType ? exam.creditType.type : undefined,
        answerLanguage: exam.answerLanguage,
        additionalInfo: exam.additionalInfo,
    });

    sendAssessment = (newState, payload, messages, exam: Examination) => {
        this.http
            .put(`/app/review/${exam.id}`, payload)
            .pipe(
                switchMap(() => this.saveFeedback$(exam)),
                tap(() => {
                    if (newState === 'REVIEW_STARTED') {
                        messages.forEach(function(msg) {
                            toast.warning(this.translate.instant(msg));
                        });
                        this.windowRef.nativeWindow.setTimeout(
                            () => toast.info(this.translate.instant('sitnet_review_saved')),
                            1000,
                        );
                    } else {
                        toast.info(this.translate.instant('sitnet_review_graded'));
                        this.location.go(this.getExitUrl(exam));
                    }
                }),
                catchError(resp => toast.error(resp.error)),
            )
            .subscribe();
    };

    getErrors = (exam: Exam) => {
        const messages: string[] = [];
        if (!_.get(exam.grade, 'id') && !exam.gradeless) {
            messages.push('sitnet_participation_unreviewed');
        }
        if (!exam.creditType.type) {
            messages.push('sitnet_exam_choose_credit_type');
        }
        if (!exam.answerLanguage) {
            messages.push('sitnet_exam_choose_response_language');
        }
        return messages;
    };

    sendToRegistry$ = (payload, res: string, exam: Examination, followUpUrl): Observable<void> => {
        payload.state = 'GRADED_LOGGED';
        return this.http.post(res, payload).pipe(
            map(() => {
                toast.info(this.translate.instant('sitnet_review_recorded'));
                this.location.go(followUpUrl || this.getExitUrl(exam));
            }),
        );
    };

    register$ = (exam: Examination, res: string, payload, followUpUrl): Observable<void> => {
        return this.saveFeedback$(exam).pipe(
            switchMap(() => this.http.put(`/app/review/${exam.id}`, payload)),
            switchMap(() => {
                if (exam.state !== 'GRADED') {
                    toast.info(this.translate.instant('sitnet_review_graded'));
                }
                return this.sendToRegistry$(payload, res, exam, followUpUrl);
            }),
        );
    };
}
