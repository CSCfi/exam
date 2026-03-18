// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { concat, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ClozeTestAnswer, EssayAnswer } from 'src/app/question/question.model';
import type { Examination, ExaminationQuestion, ExaminationSection } from './examination.model';

export interface SaveAnswerOptions {
    autosave: boolean;
    canFail: boolean;
    external: boolean;
}

export interface SaveSectionOptions {
    autosave: boolean;
    allowEmpty: boolean;
    canFail: boolean;
    external: boolean;
}

export interface SaveOptionOptions {
    preview: boolean;
    external: boolean;
}

export interface LogoutOptions {
    quitLinkEnabled: boolean;
    canFail: boolean;
    external: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExaminationService {
    readonly answerStatusVersion = signal(0);

    private readonly router = inject(Router);
    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    startExam$(hash: string, isPreview: boolean, isCollaboration: boolean, id: number): Observable<Examination> {
        const getUrl = (h: string) => (isPreview && id ? `/app/exams/${id}/preview` : `/app/student/exam/${h}`);
        return this.http.get<void>('/app/session').pipe(
            switchMap(() =>
                this.http.get<Examination>(isCollaboration ? getUrl(hash).replace('/app/', '/app/iop/') : getUrl(hash)),
            ),
            switchMap((e) => {
                if (e.cloned) {
                    this.router.navigate(['/exam', e.hash]);
                    // we came here with a reference to the parent exam so we can't directly use it, reload the student exam (copy)
                    return this.http.get<Examination>(
                        isCollaboration ? getUrl(e.hash).replace('/app/', '/app/iop/') : getUrl(e.hash),
                    );
                } else {
                    return of(e);
                }
            }),
        );
    }

    saveTextualAnswer$ = (
        esq: ExaminationQuestion,
        hash: string,
        { autosave, canFail, external }: SaveAnswerOptions,
    ): Observable<ExaminationQuestion> => {
        const type = esq.question.type;
        const answerObj = type === 'EssayQuestion' ? esq.essayAnswer : esq.clozeTestAnswer;
        if (!answerObj) {
            throw new Error('no answer object in question');
        }
        esq.questionStatus = this.translate.instant('i18n_answer_saved');
        const url = this.getResource(
            type === 'EssayQuestion'
                ? '/app/student/exam/' + hash + '/question/' + esq.id
                : '/app/student/exam/' + hash + '/clozetest/' + esq.id,
            external,
        );
        const msg = {
            answer: answerObj.answer,
            objectVersion: answerObj.objectVersion,
        };

        return this.http.post<ClozeTestAnswer | EssayAnswer>(url, msg).pipe(
            map((a) => {
                if (autosave) {
                    esq.autosaved = new Date();
                } else {
                    if (!canFail) {
                        this.toast.info(this.translate.instant('i18n_answer_saved'));
                    }
                }
                answerObj.objectVersion = a.objectVersion;
                this.setAnswerStatus(esq);
                return esq;
            }),
            catchError((err) => {
                if (!canFail) {
                    this.toast.error(err);
                }
                return throwError(() => new Error(err));
            }),
        );
    };

    saveAllTextualAnswersOfSection$ = (
        section: ExaminationSection,
        hash: string,
        { autosave, allowEmpty, canFail, external }: SaveSectionOptions,
    ) => {
        const questions = section.sectionQuestions.filter((esq) => this.isTextualAnswer(esq, allowEmpty));
        const tasks = questions.map((q) => this.saveTextualAnswer$(q, hash, { autosave, canFail, external }));
        return concat(...tasks);
    };

    saveAllClozeTestAnswersOfSection$ = (section: ExaminationSection, hash: string, options: SaveSectionOptions) => {
        const questions = section.sectionQuestions.filter(
            (esq) => esq.question.type === 'ClozeTestQuestion' && this.isTextualAnswer(esq, options.allowEmpty),
        );
        const tasks = questions.map((q) =>
            this.saveTextualAnswer$(q, hash, {
                autosave: options.autosave,
                canFail: options.canFail,
                external: options.external,
            }),
        );
        return concat(...tasks);
    };

    saveAllTextualAnswersOfExam$ = (exam: Examination, external: boolean) =>
        concat(
            ...exam.examSections.map((es) =>
                this.saveAllTextualAnswersOfSection$(es, exam.hash, {
                    autosave: false,
                    allowEmpty: true,
                    canFail: true,
                    external,
                }),
            ),
        );

    isAnswered = (sq: ExaminationQuestion) => {
        let isAnswered;
        switch (sq.question.type) {
            case 'EssayQuestion': {
                const essayAnswer = sq.essayAnswer;
                isAnswered = essayAnswer && essayAnswer.answer && this.stripHtml(essayAnswer.answer).length > 0;
                break;
            }
            case 'MultipleChoiceQuestion':
                isAnswered = sq.selectedOption || sq.options.some((o) => o.answered);
                break;
            case 'WeightedMultipleChoiceQuestion':
                isAnswered = sq.options.some((o) => o.answered);
                break;
            case 'ClozeTestQuestion': {
                const clozeTestAnswer = sq.clozeTestAnswer;
                isAnswered = clozeTestAnswer?.answer && Object.keys(clozeTestAnswer.answer).length > 0;
                break;
            }
            case 'ClaimChoiceQuestion':
                isAnswered = sq.selectedOption || sq.options.some((o) => o.answered);
                break;
            default:
                isAnswered = false;
        }
        return isAnswered;
    };

    setAnswerStatus = (sectionQuestion: ExaminationQuestion) => {
        if (this.isAnswered(sectionQuestion)) {
            sectionQuestion.answered = true;
            sectionQuestion.questionStatus = this.translate.instant('i18n_question_answered');
        } else {
            sectionQuestion.answered = false;
            sectionQuestion.questionStatus = this.translate.instant('i18n_question_unanswered');
        }
        this.answerStatusVersion.update((v) => v + 1);
    };

    saveOption = (hash: string, sq: ExaminationQuestion, { preview, external }: SaveOptionOptions) => {
        let ids: number[];
        if (sq.question.type === 'WeightedMultipleChoiceQuestion') {
            ids = sq.options.filter((o) => o.answered).map((o) => o.id as number);
        } else {
            ids = [sq.selectedOption];
        }
        if (!preview) {
            const url = this.getResource('/app/student/exam/' + hash + '/question/' + sq.id + '/option', external);
            this.http.post(url, { oids: ids }).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_answer_saved'));
                    sq.options.forEach((o) => (o.answered = ids.indexOf(o.id as number) > -1));
                    this.setAnswerStatus(sq);
                },
                error: (err) => this.toast.error(err),
            });
        } else {
            this.setAnswerStatus(sq);
        }
    };

    getSectionMaxScore = (section: ExaminationSection) => {
        if (!section || !section.sectionQuestions) {
            return 0;
        }

        const sum = section.sectionQuestions
            .filter((esq) => esq.question.type && esq.evaluationType !== 'Selection')
            .map((esq) => esq.derivedMaxScore)
            .reduce((acc, current) => acc + current, 0);

        return Number.isInteger(sum) ? sum : parseFloat(sum.toFixed(2));
    };

    abort$ = (hash: string, external: boolean): Observable<void> => {
        const url = this.getResource('/app/student/exam/abort/' + hash, external);
        return this.http.put<void>(url, {});
    };

    logout = (msg: string, hash: string, { quitLinkEnabled, canFail, external }: LogoutOptions) => {
        const ok = () => {
            this.toast.info(this.translate.instant(msg), '', { timeOut: 5000 });
            this.router.navigate(['/examination/logout'], {
                queryParams: { reason: 'finished', quitLinkEnabled: quitLinkEnabled },
            });
        };
        const url = this.getResource('/app/student/exam/' + hash, external);
        this.http.put<void>(url, {}).subscribe({
            next: ok,
            error: (resp) => {
                if (!canFail) this.toast.error(this.translate.instant(resp));
                else ok();
            },
        });
    };

    private getResource = (url: string, external: boolean) => (external ? url.replace('/app/', '/app/iop/') : url);

    private isTextualAnswer = (esq: ExaminationQuestion, allowEmpty: boolean) => {
        switch (esq.question.type) {
            case 'EssayQuestion':
                return (
                    esq.essayAnswer && (allowEmpty || (esq.essayAnswer?.answer && esq.essayAnswer.answer.length > 0))
                );
            case 'ClozeTestQuestion':
                return (
                    esq.clozeTestAnswer &&
                    (allowEmpty || (esq.clozeTestAnswer?.answer && Object.keys(esq.clozeTestAnswer.answer).length > 0))
                );
            default:
                return false;
        }
    };

    private stripHtml = (text: string) => {
        if (text.includes('math-tex')) return text;
        return new DOMParser().parseFromString(text, 'text/html').body.textContent || '';
    };
}
