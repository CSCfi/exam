// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { QuestionReview, ReviewQuestion } from 'src/app/review/review.model';
import type { User } from 'src/app/session/session.model';
import { QuestionReviewService } from './question-review.service';

describe('QuestionReviewService', () => {
    let service: QuestionReviewService;
    let http: HttpTestingController;
    const user = { id: 1 } as User;

    const answer = (state: string, score?: number, inspectors: number[] = []) =>
        ({
            selected: true,
            essayAnswer: { evaluatedScore: score, temporaryScore: score },
            examSection: { exam: { state, examInspections: inspectors.map((id) => ({ user: { id } })) } },
        }) as unknown as ReviewQuestion;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(QuestionReviewService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should lock answers whose exam is past review', () => {
        expect(service.isLocked(answer('REVIEW'), user)).toBe(false);
        expect(service.isLocked(answer('GRADED_LOGGED'), user)).toBe(true);
    });

    it('should lock graded answers for inspectors only', () => {
        expect(service.isLocked(answer('GRADED'), user)).toBe(false);
        expect(service.isLocked(answer('GRADED', undefined, [1]), user)).toBe(true);
    });

    it('should count assessed and processed answers', () => {
        const review = { answers: [answer('REVIEW', 1), answer('REVIEW'), answer('ARCHIVED')] } as QuestionReview;

        expect(service.getAssessedAnswerCount(review)).toBe(1);
        expect(service.getProcessedAnswerCount(review, user)).toBe(2);
        expect(service.isFinalized(review)).toBe(false);
        expect(service.isFinalized({ answers: [answer('REVIEW', 0)] } as QuestionReview)).toBe(true);
        expect(service.getProcessedAnswerCount(undefined, user)).toBe(0);
    });

    it('should tell assessed and evaluated answers', () => {
        expect(service.isAssessed(answer('REVIEW', 0))).toBe(true);
        expect(service.isEvaluated(answer('REVIEW'))).toBe(false);
    });

    it('should fetch reviews for the chosen questions', () => {
        service.getReviews$(5, ['1', '2']).subscribe();
        const req = http.expectOne((r) => r.url === '/app/exam/5/questions');
        expect(req.request.params.getAll('ids')).toEqual(['1', '2']);
        req.flush([]);
    });
});
