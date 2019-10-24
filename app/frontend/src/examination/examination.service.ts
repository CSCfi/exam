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
import * as _ from 'lodash';
import { from, Observable, throwError } from 'rxjs';
import { catchError, concatMap, map, tap, toArray } from 'rxjs/operators';
import * as toast from 'toastr';

import {
    ClozeTestAnswer,
    EssayAnswer,
    Exam,
    ExamSection,
    ExamSectionQuestion,
    MultipleChoiceOption,
} from '../exam/exam.model';
import { WindowRef } from '../utility/window/window.service';

export interface Examination extends Exam {
    cloned: boolean;
    external: boolean;
    examSections: ExaminationSection[];
}

export interface ExaminationQuestion extends ExamSectionQuestion {
    questionStatus: string;
    autosaved: Date;
    selectedOption: MultipleChoiceOption;
    answered: boolean;
    selectedAnsweredState: string;
}

export interface ExaminationSection extends ExamSection {
    sectionQuestions: ExaminationQuestion[];
}

@Injectable()
export class ExaminationService {
    isExternal = false;

    constructor(
        private Location: Location,
        private http: HttpClient,
        private translate: TranslateService,
        private Window: WindowRef,
    ) {}

    getResource = url => (this.isExternal ? url.replace('/app/', '/app/iop/') : url);

    startExam$(hash, isPreview, isCollaboration, id): Observable<Examination> {
        const url = isPreview && id ? '/app/exams/' + id + '/preview' : '/app/student/exam/' + hash;
        return this.http.get<Examination>(isCollaboration ? url.replace('/app/', '/integration/iop/') : url).pipe(
            tap(e => {
                if (e.cloned) {
                    // we came here with a reference to the parent exam so do not render page just yet,
                    // reload with reference to student exam that we just created
                    this.Location.go('/student/exam/' + e.hash);
                }
                this.isExternal = e.external;
                return e;
            }),
        );
    }

    saveTextualAnswer = (esq: ExaminationQuestion, hash, autosave): Observable<ExaminationQuestion> => {
        const type = esq.question.type;
        const answerObj = type === 'EssayQuestion' ? esq.essayAnswer : esq.clozeTestAnswer;
        if (!answerObj) {
            throw new Error('no answer object in question');
        }
        esq.questionStatus = this.translate.instant('sitnet_answer_saved');
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
            map(a => {
                if (autosave) {
                    esq.autosaved = new Date();
                } else {
                    toast.info(this.translate.instant('sitnet_answer_saved'));
                    // this.setQuestionColors(esq);
                }
                answerObj.objectVersion = a.objectVersion;
                return esq;
            }),
            catchError(resp => {
                if (resp.error) {
                    toast.error(resp.error);
                }
                return throwError(resp);
            }),
        );
    };

    private isTextualAnswer = (esq: ExaminationQuestion, allowEmpty: boolean) => {
        switch (esq.question.type) {
            case 'EssayQuestion':
                return esq.essayAnswer && (allowEmpty || esq.essayAnswer.answer.length > 0);
            case 'ClozeTestQuestion':
                return esq.clozeTestAnswer && (allowEmpty || !_.isEmpty(esq.clozeTestAnswer.answer));
            default:
                return false;
        }
    };

    saveAllTextualAnswersOfSection = (
        section: ExaminationSection,
        hash,
        autosave,
        allowEmpty,
    ): Observable<ExaminationQuestion[]> => {
        const questions = section.sectionQuestions.filter(esq => this.isTextualAnswer(esq, allowEmpty));
        return from(questions).pipe(
            concatMap(q => this.saveTextualAnswer(q, hash, autosave)),
            toArray(),
        );
    };

    saveAllTextualAnswersOfExam = (exam: Examination): Observable<unknown> =>
        from(exam.examSections).pipe(concatMap(es => this.saveAllTextualAnswersOfSection(es, exam.hash, false, true)));

    private stripHtml = text => {
        if (text && text.indexOf('math-tex') === -1) {
            return String(text).replace(/<[^>]+>/gm, '');
        }
        return text;
    };

    isAnswered = (sq: ExaminationQuestion) => {
        let isAnswered;
        switch (sq.question.type) {
            case 'EssayQuestion': {
                const essayAnswer = sq.essayAnswer;
                isAnswered = essayAnswer && essayAnswer.answer && this.stripHtml(essayAnswer.answer).length > 0;
                break;
            }
            case 'MultipleChoiceQuestion':
                isAnswered = _.isObject(sq.selectedOption) || sq.options.some(o => o.answered);
                break;
            case 'WeightedMultipleChoiceQuestion':
                isAnswered = sq.options.some(o => o.answered);
                break;
            case 'ClozeTestQuestion': {
                const clozeTestAnswer = sq.clozeTestAnswer;
                isAnswered = clozeTestAnswer && !_.isEmpty(clozeTestAnswer.answer);
                break;
            }
            default:
                isAnswered = false;
        }
        return isAnswered;
    };

    setQuestionColors = (sectionQuestion: ExaminationQuestion) => {
        if (this.isAnswered(sectionQuestion)) {
            sectionQuestion.answered = true;
            sectionQuestion.questionStatus = this.translate.instant('sitnet_question_answered');
            sectionQuestion.selectedAnsweredState = 'question-answered-header';
        } else {
            sectionQuestion.answered = false;
            sectionQuestion.questionStatus = this.translate.instant('sitnet_question_unanswered');
            sectionQuestion.selectedAnsweredState = 'question-unanswered-header';
        }
    };

    saveOption = (hash, sq: ExaminationQuestion, preview) => {
        let ids;
        if (sq.question.type === 'WeightedMultipleChoiceQuestion') {
            ids = sq.options.filter(o => o.answered).map(o => o.id);
        } else {
            ids = [sq.selectedOption];
        }
        if (!preview) {
            const url = this.getResource('/app/student/exam/' + hash + '/question/' + sq.id + '/option');
            this.http.post(url, { oids: ids }).subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_answer_saved'));
                    sq.options.forEach(o => (o.answered = ids.indexOf(o.id) > -1));
                    this.setQuestionColors(sq);
                },
                resp => toast.error(resp.error),
            );
        } else {
            this.setQuestionColors(sq);
        }
    };

    abort$ = (hash: string): Observable<void> => {
        const url = this.getResource('/app/student/exam/abort/' + hash);
        return this.http.put<void>(url, {});
    };

    logout = (msg: string, hash: string, quitLinkEnabled: boolean) => {
        const url = this.getResource('/app/student/exam/' + hash);
        this.http.put(url, {}).subscribe(
            () => {
                toast.info(this.translate.instant(msg), '', { timeOut: 5000 });
                this.Window.nativeWindow().onbeforeunload = null;
                this.Location.go('/student/logout/finished/' + quitLinkEnabled);
            },
            resp => toast.error(this.translate.instant(resp.data)),
        );
    };
}
