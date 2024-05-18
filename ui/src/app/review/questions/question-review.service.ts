// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { QuestionReview, ReviewQuestion } from 'src/app/review/review.model';
import type { User } from 'src/app/session/session.service';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';

@Injectable({ providedIn: 'root' })
export class QuestionReviewService {
    constructor(private http: HttpClient) {}

    questionsApi = (id: number) => `/app/exam/${id}/questions`;

    isFinalized = (review: QuestionReview) =>
        !review ? false : review.answers.length === this.getAssessedAnswerCount(review);

    isAssessed = (answer: ReviewQuestion) =>
        answer.selected && answer.essayAnswer && isNumber(answer.essayAnswer.temporaryScore);

    isEvaluated = (answer: ReviewQuestion) =>
        answer.selected && answer.essayAnswer && isNumber(answer.essayAnswer.evaluatedScore);

    isLocked = (answer: ReviewQuestion, user: User) => {
        const states = ['REVIEW', 'REVIEW_STARTED'];
        const exam = answer.examSection.exam;
        const isInspector = exam.examInspections.map((ei) => ei.user.id).indexOf(user.id) > -1;
        if (!isInspector) {
            states.push('GRADED');
        }
        return states.indexOf(exam.state) === -1;
    };

    getAssessedAnswerCount = (review: QuestionReview) =>
        !review ? 0 : review.answers.filter((a) => a.essayAnswer && isNumber(a.essayAnswer.evaluatedScore)).length;

    getReviews$ = (examId: number, ids: string[] = []): Observable<QuestionReview[]> =>
        this.http.get<QuestionReview[]>(`/app/exam/${examId}/questions`, { params: { ids: ids } });

    getProcessedAnswerCount = (review?: QuestionReview, user?: User) => {
        if (!review || !user) {
            return 0;
        }
        return review.answers.filter(
            (a) => this.isLocked(a, user) || (a.essayAnswer && isNumber(a.essayAnswer.evaluatedScore)),
        ).length;
    };
}
