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
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { concat, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import type { ClozeTestAnswer, EssayAnswer } from 'src/app/exam/exam.model';
import type { Examination, ExaminationQuestion, ExaminationSection } from './examination.model';

@Injectable({ providedIn: 'root' })
export class ExaminationService {
    isExternal = false;

    constructor(
        private router: Router,
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    getResource = (url: string) => (this.isExternal ? url.replace('/app/', '/app/iop/') : url);

    getLtiInitiateUrl$() {
        return 'http://localhost:9000/integration/lti/start-login';
    }

    startExam$(hash: string, isPreview: boolean, isCollaboration: boolean, id: number): Observable<Examination> {
        console.log('startExam');
        const getUrl = (h: string) => (isPreview && id ? `/app/exams/${id}/preview` : `/app/student/exam/${h}`);
        // const ltiUrl = (h: string) => (isPreview ? `/app/lti/start-login` : null);

        // this.http.get('/app/lti/start-login').subscribe();

        return this.http.get<void>('/app/session').pipe(
            switchMap(() =>
                this.http.get<Examination>(isCollaboration ? getUrl(hash).replace('/app/', '/app/iop/') : getUrl(hash)),
            ),
            switchMap((e) => {
                this.isExternal = e.external;
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
        autosave: boolean,
        canFail: boolean,
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
        autosave: boolean,
        allowEmpty: boolean,
        canFail: boolean,
    ) => {
        const questions = section.sectionQuestions.filter((esq) => this.isTextualAnswer(esq, allowEmpty));
        const tasks = questions.map((q) => this.saveTextualAnswer$(q, hash, autosave, canFail));
        return concat(...tasks);
    };

    saveAllTextualAnswersOfExam$ = (exam: Examination) =>
        concat(
            ...exam.examSections.map((es) => this.saveAllTextualAnswersOfSection$(es, exam.hash, false, true, true)),
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
    };

    saveOption = (hash: string, sq: ExaminationQuestion, preview: boolean) => {
        let ids: number[];
        if (sq.question.type === 'WeightedMultipleChoiceQuestion') {
            ids = sq.options.filter((o) => o.answered).map((o) => o.id as number);
        } else {
            ids = [sq.selectedOption];
        }
        if (!preview) {
            const url = this.getResource('/app/student/exam/' + hash + '/question/' + sq.id + '/option');
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

    abort$ = (hash: string): Observable<void> => {
        const url = this.getResource('/app/student/exam/abort/' + hash);
        return this.http.put<void>(url, {});
    };

    logout = (msg: string, hash: string, quitLinkEnabled: boolean, canFail: boolean) => {
        const ok = () => {
            this.toast.info(this.translate.instant(msg), '', { timeOut: 5000 });
            this.router.navigate(['/examination/logout'], {
                queryParams: { reason: 'finished', quitLinkEnabled: quitLinkEnabled },
            });
        };
        const url = this.getResource('/app/student/exam/' + hash);
        this.http.put<void>(url, {}).subscribe({
            next: ok,
            error: (resp) => {
                if (!canFail) this.toast.error(this.translate.instant(resp));
                else ok();
            },
        });
    };

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
        if (text && text.indexOf('math-tex') === -1) {
            return String(text).replace(/<[^>]+>/gm, '');
        }
        return text;
    };
}
