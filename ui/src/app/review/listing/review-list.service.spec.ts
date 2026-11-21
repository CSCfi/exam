// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, toArray } from 'rxjs';
import type { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import type { Review } from 'src/app/review/review.model';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { ReviewListService } from './review-list.service';

describe('ReviewListService', () => {
    let service: ReviewListService;
    let http: HttpTestingController;
    const toast = { warning: vi.fn(), error: vi.fn() };

    const participation = (overrides: Partial<ExamParticipation> = {}, exam: Partial<Exam> = {}) =>
        ({
            id: 1,
            user: { firstName: 'Maija', lastName: 'Meikäläinen', email: 'maija@example.org' },
            started: '2030-06-12T08:00:00Z',
            ended: '2030-06-12T09:30:00Z',
            exam: {
                id: 10,
                state: 'REVIEW',
                grade: { id: 3, name: '3' },
                gradingType: 'GRADED',
                creditType: { type: 'FINAL' },
                answerLanguage: 'fi',
                customCredit: 5,
                totalScore: 12,
                ...exam,
            },
            ...overrides,
        }) as unknown as ExamParticipation;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
        });
        service = TestBed.inject(ReviewListService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should keep the wanted states and add the display data', () => {
        const reviews = service.filterByStateAndEnhance(['REVIEW'], [
            participation(),
            participation({ id: 2 }, { state: 'GRADED' }),
            participation(
                { id: 3, user: undefined },
                { id: 30, languageInspection: { finishedAt: undefined } as unknown as Exam['languageInspection'] },
            ),
        ] as ExamParticipation[]);

        expect(reviews.map((r) => [r.displayName, r.duration, r.isUnderLanguageInspection])).toEqual([
            ['Meikäläinen Maija', '90', undefined],
            ['30', '90', true],
        ]);
    });

    it('should name anonymous collaborative reviews by their reference', () => {
        expect(service.getDisplayName(participation({ user: undefined, _id: 'abc' }), true)).toBe('abc');
    });

    describe('filtering', () => {
        const review = (p: ExamParticipation, collaborative = false): Review => ({
            examParticipation: p,
            grades: [],
            displayName: service.getDisplayName(p, collaborative),
            duration: '',
            isUnderLanguageInspection: false,
            selected: false,
        });

        it('should match name and email', () => {
            const items = [review(participation())];
            expect(service.applyFilter('maija meik', items)).toHaveLength(1);
            expect(service.applyFilter('EXAMPLE.ORG', items)).toHaveLength(1);
            expect(service.applyFilter('teppo', items)).toHaveLength(0);
            expect(service.applyFilter('', items)).toBe(items);
        });

        it('should filter anonymous reviews by their display name', () => {
            const items = [
                review(participation({ user: undefined, _id: 'abc' }), true),
                review(participation({ user: undefined, _id: 'def' }), true),
            ];
            expect(service.applyFilter('ab', items).map((r) => r.displayName)).toEqual(['abc']);
        });
    });

    describe('selecting', () => {
        const items = () =>
            [1, 2].map((id) => ({ examParticipation: participation({ id }), selected: false }) as unknown as Review);

        it('should select all and then none', () => {
            const scope = { all: false, page: false };
            const reviews = items();

            service.selectAll(scope, reviews);
            expect(reviews.every((r) => r.selected)).toBe(true);
            service.selectAll(scope, reviews);
            expect(reviews.some((r) => r.selected)).toBe(false);
        });

        it('should select the boxes shown on the page', () => {
            document.body.innerHTML = '<input class="box" value="2" />';
            const reviews = items();

            service.selectPage({ all: false, page: false }, reviews, 'box');

            expect(reviews.map((r) => r.selected)).toEqual([false, true]);
            document.body.innerHTML = '';
        });

        it('should warn when nothing is selected', () => {
            expect(service.getSelectedReviews(items())).toEqual([]);
            expect(toast.warning).toHaveBeenCalledWith('i18n_choose_atleast_one');
        });
    });

    describe('recording', () => {
        it('should register a graded review', async () => {
            const done = firstValueFrom(service.sendToRegistry$(participation()));
            const req = http.expectOne('/app/exam/record');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toMatchObject({ id: 10, state: 'GRADED_LOGGED', gradingType: 'GRADED' });
            req.flush({});
            await done;
        });

        it('should archive an ungraded review through register', async () => {
            const done = firstValueFrom(
                service.sendToArchive$(participation({}, { grade: undefined, gradingType: 'NOT_GRADED' })),
            );
            const req = http.expectOne('/app/exam/register');
            expect(req.request.body.state).toBe('ARCHIVED');
            req.flush({});
            await done;
        });

        it('should record a collaborative review with its revision', async () => {
            const done = firstValueFrom(service.sendToRegistry$(participation({ _id: 'abc', _rev: '1-a' }), 7));
            const req = http.expectOne('/app/iop/reviews/7/abc/record');
            expect(req.request.method).toBe('PUT');
            expect(req.request.body.rev).toBe('1-a');
            req.flush({ rev: '2-b' });

            expect((await done)._rev).toBe('2-b');
        });

        it('should refuse an incomplete review', async () => {
            const sent = await firstValueFrom(
                service.sendToRegistry$(participation({}, { answerLanguage: undefined })).pipe(toArray()),
            );

            expect(sent).toEqual([]);
            expect(toast.error).toHaveBeenCalledWith('i18n_failed_to_record_review');
        });
    });

    it('should fetch reviews from the right place', () => {
        service.getReviews$(7).subscribe();
        service.getReviews$(7, true).subscribe();
        http.expectOne('/app/reviews/7').flush([]);
        http.expectOne('/app/iop/reviews/7').flush([]);
    });

    it('should translate the grade', () => {
        expect(service.translateGrade({ gradingType: 'NOT_GRADED' } as Exam)).toBe('i18n_no_grading');
        expect(service.translateGrade({ gradingType: 'POINT_GRADED' } as Exam)).toBe('i18n_point_graded');
        expect(service.translateGrade({ gradingType: 'GRADED' } as Exam)).toBe('');
    });
});
