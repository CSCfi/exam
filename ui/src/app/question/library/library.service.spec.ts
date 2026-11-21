// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { LibraryQuestion } from 'src/app/question/question.model';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { UserService } from 'src/app/shared/user/user.service';
import { vi } from 'vitest';
import { LibraryService } from './library.service';

describe('LibraryService', () => {
    let service: LibraryService;
    let http: HttpTestingController;
    let stored: Record<string, unknown>;
    const users = { listUsersByRole$: vi.fn(() => of([])) };

    const question = (id: number, overrides: object = {}) =>
        ({
            id,
            type: 'EssayQuestion',
            question: '<p>What is <b>C++</b>?</p>',
            defaultEvaluationType: 'Points',
            defaultMaxScore: 4,
            questionOwners: [{ firstName: 'Teppo', lastName: 'Testaaja' }],
            examSectionQuestions: [],
            options: [],
            ...overrides,
        }) as unknown as LibraryQuestion;
    const inExam = (code: string | undefined, state = 'PUBLISHED', periodEnd = '2999-01-01T00:00:00Z') => ({
        examSection: { exam: { course: code ? { code } : undefined, state, periodEnd } },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        stored = {};
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: StorageService,
                    useValue: {
                        get: (key: string) => stored[key] ?? null,
                        set: (key: string, value: unknown) => (stored[key] = value),
                    },
                },
                { provide: UserService, useValue: users },
                {
                    provide: QuestionScoringService,
                    useValue: {
                        calculateDefaultMaxPoints: () => 6,
                        getCorrectClaimChoiceOptionDefaultScore: () => 2,
                    },
                },
            ],
        });
        service = TestBed.inject(LibraryService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('free search', () => {
        const questions = [
            question(1),
            question(22, { question: 'Derivatives', examSectionQuestions: [inExam('MA-101'), inExam(undefined)] }),
        ];
        const ids = (text?: string) => service.applyFreeSearchFilter(text, questions).map((q) => q.id);

        it('should match the question text without its markup', () => {
            expect(ids('is c++')).toEqual([1]);
            expect(ids('<b>')).toEqual([]);
        });

        it('should match the id and the course code', () => {
            expect(ids('22')).toEqual([22]);
            expect(ids('ma-1')).toEqual([22]);
        });

        it('should take the text literally', () => {
            expect(ids('(')).toEqual([]);
            expect(ids('C++?')).toEqual([1]);
            expect(ids('.*')).toEqual([]);
        });

        it('should keep all without a text', () => {
            expect(ids(undefined)).toEqual([1, 22]);
        });
    });

    it('should filter by owner name', () => {
        const questions = [question(1), question(2, { questionOwners: [{ firstName: 'Maija', lastName: 'M' }] })];

        expect(service.applyOwnerSearchFilter('teppo test', questions).map((q) => q.id)).toEqual([1]);
        expect(service.applyOwnerSearchFilter('(', questions)).toEqual([]);
        expect(service.applyOwnerSearchFilter('', questions)).toBe(questions);
    });

    it('should store filters per category', () => {
        service.storeFilters({ text: 'x' }, 'library');
        service.storeFilters({ text: 'y' }, 'other');

        expect(service.loadFilters('library')).toEqual({ filters: { text: 'x' } });
        expect(service.loadFilters('other')).toEqual({ filters: { text: 'y' } });
        expect(service.loadFilters('none')).toEqual({});
    });

    describe('search', () => {
        it('should send the chosen ids as repeated params', () => {
            service.search([1, 2], [], [3], [], [4]).subscribe();

            const req = http.expectOne((r) => r.url === '/app/questions');
            expect(req.request.params.getAll('courseIds')).toEqual(['1', '2']);
            expect(req.request.params.getAll('sectionIds')).toEqual(['3']);
            expect(req.request.params.getAll('ownerIds')).toEqual(['4']);
            expect(req.request.params.has('examIds')).toBe(false);
            req.flush([]);
        });

        it('should add what the listing shows', async () => {
            const done = firstValueFrom(service.search([], [], [], [], []));
            http.expectOne('/app/questions').flush([
                question(1),
                question(2, { type: 'WeightedMultipleChoiceQuestion', defaultEvaluationType: undefined }),
                question(3, { type: 'ClaimChoiceQuestion', defaultEvaluationType: undefined }),
                question(4, { defaultEvaluationType: 'Selection' }),
                question(5, { type: 'MultipleChoiceQuestion', defaultMaxScore: undefined }),
            ]);
            const result = await done;

            expect(result.map((q) => [q.icon, q.displayedMaxScore, q.typeOrd])).toEqual([
                ['bi-pencil', 4, 0],
                ['bi-check-2-square', 6, 3],
                ['bi-file-binary', 2, 4],
                ['bi-pencil', 'i18n_evaluation_select', 0],
                ['bi-ui-radios', 0, 2],
            ]);
            expect(result[0].ownerAggregate).toBe('TestaajaTeppo');
        });

        it('should not allow removing a question in an ongoing published exam', async () => {
            const done = firstValueFrom(service.search([], [], [], [], []));
            http.expectOne('/app/questions').flush([
                question(1, { examSectionQuestions: [inExam('A')] }),
                question(2, { examSectionQuestions: [inExam('A', 'PUBLISHED', '2000-01-01T00:00:00Z')] }),
                question(3, { examSectionQuestions: [inExam('A', 'DRAFT')] }),
            ]);

            expect((await done).map((q) => q.allowedToRemove)).toEqual([false, true, true]);
        });
    });

    it('should list filter options with the other choices as params', () => {
        service.listExams$([1], [2], [3], [4]).subscribe();
        service.listCourses$([5], [], [], []).subscribe();
        service.listSections$([], [6], [], []).subscribe();
        service.listTags$([], [], [7], []).subscribe();

        const exams = http.expectOne((r) => r.url === '/app/examsearch');
        expect(exams.request.params.getAll('tagIds')).toEqual(['3']);
        exams.flush([]);
        const courses = http.expectOne((r) => r.url === '/app/courses/user');
        expect(courses.request.params.getAll('examIds')).toEqual(['5']);
        courses.flush([]);
        http.expectOne((r) => r.url === '/app/sections').flush([]);
        http.expectOne((r) => r.url === '/app/tags').flush([]);
    });

    it('should tag questions', () => {
        service.addTagForQuestions$(3, [1, 2]).subscribe();
        const req = http.expectOne('/app/tags/questions');
        expect(req.request.body).toEqual({ questionIds: [1, 2], tagId: 3 });
        req.flush(null);
    });
});
