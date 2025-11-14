// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Course, Exam, ExamSection } from 'src/app/exam/exam.model';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { LibraryQuestion, Tag } from 'src/app/question/question.model';
import { User } from 'src/app/session/session.model';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { UserService } from 'src/app/shared/user/user.service';

@Injectable({ providedIn: 'root' })
export class LibraryService {
    private http = inject(HttpClient);
    private Storage = inject(StorageService);
    private QuestionScore = inject(QuestionScoringService);
    private User = inject(UserService);

    listExams$ = (
        courseIds: number[],
        sectionIds: number[],
        tagIds: number[],
        ownerIds: number[],
    ): Observable<Exam[]> =>
        this.http.get<Exam[]>('/app/examsearch', {
            params: this.getQueryParams(courseIds, [], sectionIds, tagIds, ownerIds),
        });

    listCourses$ = (
        examIds: number[],
        sectionIds: number[],
        tagIds: number[],
        ownerIds: number[],
    ): Observable<Course[]> =>
        this.http.get<Course[]>('/app/courses/user', {
            params: this.getQueryParams([], examIds, sectionIds, tagIds, ownerIds),
        });

    listSections$ = (
        courseIds: number[],
        examIds: number[],
        tagIds: number[],
        ownerIds: number[],
    ): Observable<ExamSection[]> =>
        this.http.get<ExamSection[]>('/app/sections', {
            params: this.getQueryParams(courseIds, examIds, [], tagIds, ownerIds),
        });

    listTags$ = (courseIds: number[], examIds: number[], sectionIds: number[], ownerIds: number[]): Observable<Tag[]> =>
        this.http.get<Tag[]>('/app/tags', {
            params: this.getQueryParams(courseIds, sectionIds, examIds, [], ownerIds),
        });

    listAllTags$ = (): Observable<Tag[]> => this.http.get<Tag[]>('/app/tags');

    listAllOwners$ = (): Observable<User[]> => this.User.listUsersByRole$('TEACHER');

    addTagForQuestions$ = (tagId: number, questionIds: number[]) =>
        this.http.post<void>('/app/tags/questions', { questionIds: questionIds, tagId: tagId });

    loadFilters = (category: string) => {
        const entry = this.Storage.get<{ [key: string]: string }>('questionFilters');
        return entry && entry[category] ? JSON.parse(entry[category]) : {};
    };

    storeFilters = (filters: unknown, category: string) => {
        const data = { filters: filters };
        const filter = this.Storage.get<{ [key: string]: string }>('questionFilters') || {};
        filter[category] = JSON.stringify(data);
        this.Storage.set('questionFilters', filter);
    };

    applyFreeSearchFilter = (text: string | undefined, questions: LibraryQuestion[]) => {
        if (text) {
            return questions.filter((question) => {
                const re = new RegExp(text, 'i');

                const isMatch = question.question && this.htmlDecode(question.question).match(re);
                const idMatches = String(question.id).match(re);
                if (isMatch || idMatches) {
                    return true;
                }
                // match course code
                return (
                    question.examSectionQuestions.filter(
                        (esq) =>
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
            return questions.filter((question) => {
                const re = new RegExp(text, 'i');
                const owner = question.questionOwners.map((o) => o.firstName + ' ' + o.lastName).toString();
                return owner.match(re);
            });
        } else {
            return questions;
        }
    };

    search = (
        courseIds: number[],
        examIds: number[],
        sectionIds: number[],
        tagIds: number[],
        ownerIds: number[],
    ): Observable<LibraryQuestion[]> =>
        this.http
            .get<LibraryQuestion[]>('/app/questions', {
                params: this.getQueryParams(courseIds, examIds, sectionIds, tagIds, ownerIds),
            })
            .pipe(
                map((questions) => {
                    questions.map((question) => Object.assign(question, { icon: this.getIcon(question) }));
                    questions.forEach((q) => {
                        q.displayedMaxScore = this.getDisplayedMaxScore(q);
                        q.typeOrd = [
                            'EssayQuestion',
                            'ClozeTestQuestion',
                            'MultipleChoiceQuestion',
                            'WeightedMultipleChoiceQuestion',
                            'ClaimChoiceQuestion',
                        ].indexOf(q.type);
                        q.ownerAggregate = this.getOwnerAggregate(q);
                        q.allowedToRemove =
                            q.examSectionQuestions.filter(function (esq) {
                                const exam = esq.examSection.exam;
                                return (
                                    exam.state === 'PUBLISHED' &&
                                    new Date(exam.periodEnd || 0).getTime() > new Date().getTime()
                                );
                            }).length === 0;
                    });
                    return questions;
                }),
            );

    private getQueryParams = (
        courseIds: number[],
        examIds: number[],
        sectionIds: number[],
        tagIds: number[],
        ownerIds: number[],
    ) => {
        let params = new HttpParams();

        const append = (key: string, idArray: number[], paramsObj: HttpParams) => {
            return idArray.reduce((paramObj, currentId) => paramObj.append(key, currentId.toString()), paramsObj);
        };

        if (courseIds.length > 0) {
            params = append('course', courseIds, params);
        }
        if (sectionIds.length > 0) {
            params = append('section', sectionIds, params);
        }
        if (tagIds.length > 0) {
            params = append('tag', tagIds, params);
        }
        if (examIds.length > 0) {
            params = append('exam', examIds, params);
        }
        if (ownerIds.length > 0) {
            params = append('owner', ownerIds, params);
        }

        return params;
    };

    private getIcon = (question: LibraryQuestion) => {
        switch (question.type) {
            case 'MultipleChoiceQuestion':
                return 'bi-ui-radios';
            case 'WeightedMultipleChoiceQuestion':
                return 'bi-check-2-square';
            case 'EssayQuestion':
                return 'bi-pencil';
            case 'ClozeTestQuestion':
                return 'bi-pencil-check';
            case 'ClaimChoiceQuestion':
                return 'bi-file-binary';
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
            return 'i18n_evaluation_select';
        } else if (q.type === 'WeightedMultipleChoiceQuestion') {
            return this.QuestionScore.calculateDefaultMaxPoints(q.options);
        } else if (q.type === 'ClaimChoiceQuestion') {
            return this.QuestionScore.getCorrectClaimChoiceOptionDefaultScore(q.options);
        }
        return '';
    };

    private getOwnerAggregate = (q: LibraryQuestion): string =>
        q.questionOwners.reduce((acc, owner) => acc + owner.lastName + owner.firstName, '');

    private htmlDecode = (text: string) => {
        const el = document.createElement('html');
        el.innerHTML = text;
        return el.textContent ? el.textContent : '';
    };
}
