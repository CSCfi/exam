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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { SESSION_STORAGE, WebStorageService } from 'angular-webstorage-service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Course, Exam, ReverseQuestion, Tag } from '../../exam/exam.model';
import { QuestionService } from '../question.service';

export interface LibraryQuestion extends ReverseQuestion {
    icon: string;
    displayedMaxScore: number | string;
    typeOrd: number;
    ownerAggregate: string;
    allowedToRemove: boolean;
}

@Injectable()
export class LibraryService {
    constructor(
        private http: HttpClient,
        @Inject(SESSION_STORAGE) private webStorageService: WebStorageService,
        private Question: QuestionService,
    ) {}

    private getQueryParams = (courseIds: number[], sectionIds: number[], tagIds: number[], examIds?: number[]) => {
        const params = new HttpParams();
        if (courseIds.length > 0) {
            params.set('courseIds', courseIds.join());
        }
        if (sectionIds.length > 0) {
            params.set('sectionIds', sectionIds.join());
        }
        if (tagIds.length > 0) {
            params.set('tagIds', tagIds.join());
        }
        if (examIds && examIds.length > 0) {
            params.set('examIds', examIds.join());
        }
        return params;
    };

    listExams = (courseIds: number[], sectionIds: number[], tagIds: number[]): Observable<Exam[]> =>
        this.http.get<Exam[]>('/app/examsearch', { params: this.getQueryParams(courseIds, sectionIds, tagIds) });

    listCourses = (courseIds: number[], sectionIds: number[], tagIds: number[]): Observable<Course[]> =>
        this.http.get<Course[]>('/app/courses/user', { params: this.getQueryParams(courseIds, sectionIds, tagIds) });

    listTags = (courseIds: number[], sectionIds: number[], tagIds: number[]): Observable<Tag[]> =>
        this.http.get<Course[]>('/app/tags', { params: this.getQueryParams(courseIds, sectionIds, tagIds) });

    loadFilters = (category: string) => {
        const entry = this.webStorageService.get('questionFilters');
        return entry && entry[category] ? JSON.parse(entry[category]) : {};
    };

    storeFilters = (filters: any, category: string) => {
        const data = { filters: filters };
        const filter = this.webStorageService.get('questionFilters') || {};
        filter[category] = JSON.stringify(data);
        this.webStorageService.set('questionFilters', filter);
    };

    applyFreeSearchFilter = (text: string | undefined, questions: LibraryQuestion[]) => {
        if (text) {
            return questions.filter(question => {
                const re = new RegExp(text, 'i');

                const isMatch = question.question && this.htmlDecode(question.question).match(re);
                if (isMatch) {
                    return true;
                }
                // match course code
                return (
                    question.examSectionQuestions.filter(
                        esq =>
                            // Course can be empty in case of a copied exam
                            esq.examSection.exam.course && esq.examSection.exam.course.code.match(re),
                    ).length > 0
                );
            });
        } else {
            return questions;
        }
    };

    applyOwnerSearchFilter = (text: string, questions: LibraryQuestion[]) => {
        if (text) {
            return questions.filter(question => {
                const re = new RegExp(text, 'i');
                const owner = question.creator ? question.creator.firstName + ' ' + question.creator.lastName : '';
                return owner.match(re);
            });
        } else {
            return questions;
        }
    };

    private getIcon = (question: LibraryQuestion) => {
        switch (question.type) {
            case 'MultipleChoiceQuestion':
                return 'fa-list-ul';
            case 'WeightedMultipleChoiceQuestion':
                return 'fa-balance-scale';
            case 'EssayQuestion':
                return 'fa-edit';
            case 'ClozeTestQuestion':
                return 'fa-commenting-o';
            default:
                return '';
        }
    };

    private getDisplayedMaxScore = (q: LibraryQuestion): number | string => {
        if (
            q.defaultEvaluationType === 'Points' ||
            q.type === 'ClozeTestQuestion' ||
            q.type === 'MultipleChoiceQuestion'
        ) {
            return q.defaultMaxScore || 0;
        } else if (q.defaultEvaluationType === 'Selection') {
            return 'sitnet_evaluation_select';
        } else if (q.type === 'WeightedMultipleChoiceQuestion') {
            return this.Question.calculateDefaultMaxPoints(q);
        }
        return '';
    };

    private getOwnerAggregate = (q: LibraryQuestion): string =>
        q.questionOwners.reduce((acc, owner) => acc + owner.lastName + owner.firstName, '');

    search = (
        examIds: number[],
        courseIds: number[],
        tagIds: number[],
        sectionIds: number[],
    ): Observable<LibraryQuestion[]> =>
        this.http
            .get<LibraryQuestion[]>('/app/questions', {
                params: this.getQueryParams(courseIds, sectionIds, tagIds, examIds),
            })
            .pipe(
                map(questions => {
                    questions.map(question => Object.assign(question, { icon: this.getIcon(question) }));
                    questions.forEach(q => {
                        q.displayedMaxScore = this.getDisplayedMaxScore(q);
                        q.typeOrd = [
                            'EssayQuestion',
                            'ClozeTestQuestion',
                            'MultipleChoiceQuestion',
                            'WeightedMultipleChoiceQuestion',
                        ].indexOf(q.type);
                        q.ownerAggregate = this.getOwnerAggregate(q);
                        q.allowedToRemove =
                            q.examSectionQuestions.filter(function(esq) {
                                const exam = esq.examSection.exam;
                                return (
                                    exam.state === 'PUBLISHED' &&
                                    new Date(exam.examActiveEndDate).getTime() > new Date().getTime()
                                );
                            }).length === 0;
                    });
                    return questions;
                }),
            );

    private htmlDecode = (text: string) =>
        $('<div/>')
            .html(text)
            .text();
}
