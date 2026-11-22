// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { LibraryQuestion } from 'src/app/question/question.model';
import { SessionService } from 'src/app/session/session.service';
import { CourseCodeService } from 'src/app/shared/miscellaneous/course-code.service';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { vi } from 'vitest';
import { LibrarySearchComponent } from './library-search.component';

describe('LibrarySearchComponent', () => {
    let component: LibrarySearchComponent;
    let fixture: ComponentFixture<LibrarySearchComponent>;
    let http: HttpTestingController;
    let stored: Record<string, unknown>;
    let user: { id: number; isAdmin: boolean; isSupport: boolean };
    let emitted: LibraryQuestion[][];

    const question = (id: number, text: string, owner = { id: 1, firstName: 'Teppo', lastName: 'Testaaja' }) => ({
        id,
        type: 'EssayQuestion',
        question: text,
        questionOwners: [owner],
        examSectionQuestions: [],
    });
    const questions = [
        question(1, 'Derivatives'),
        question(2, 'Integrals', { id: 2, firstName: 'Maija', lastName: 'M' }),
    ];
    const searchReq = () => http.expectOne((r) => r.url === '/app/questions');
    const ids = () => emitted.at(-1)?.map((q) => q.id);

    const create = () => {
        fixture = TestBed.createComponent(LibrarySearchComponent);
        component = fixture.componentInstance;
        emitted = [];
        component.updated.subscribe((q) => emitted.push(q));
        fixture.detectChanges();
    };

    beforeEach(() => {
        stored = {};
        user = { id: 1, isAdmin: false, isSupport: false };
        TestBed.configureTestingModule({
            imports: [LibrarySearchComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: SessionService, useValue: { getUser: () => user } },
                { provide: CourseCodeService, useValue: { formatCode: (c: string) => c } },
                { provide: QuestionScoringService, useValue: {} },
                {
                    provide: StorageService,
                    useValue: {
                        get: (key: string) => stored[key] ?? null,
                        set: (key: string, value: unknown) => (stored[key] = value),
                    },
                },
            ],
        });
        TestBed.overrideComponent(LibrarySearchComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        vi.useRealTimers();
    });

    it('should list all questions at first', () => {
        create();
        searchReq().flush(questions);
        expect(ids()).toEqual([1, 2]);
    });

    it('should narrow by a chosen course and remember it', () => {
        create();
        searchReq().flush(questions);

        component.onCourseOpen(true);
        http.expectOne((r) => r.url === '/app/courses/user').flush([
            { id: 5, name: 'Maths', code: 'MA1' },
            { id: 6, name: 'Algebra', code: 'MA2' },
        ]);
        expect(component.courseOptions().map((o) => o.label)).toEqual(['MA2 Algebra', 'MA1 Maths']);

        component.onFilterOptionSelected(component.courseOptions()[1]);
        const req = searchReq();
        expect(req.request.params.getAll('courseIds')).toEqual(['5']);
        req.flush([questions[0]]);

        expect(ids()).toEqual([1]);
        expect(component.courseOptions().map((o) => o.id)).toEqual([6]);
        expect(component.getFilters().map((f) => f.id)).toEqual([5]);
        expect(JSON.parse((stored.questionFilters as Record<string, string>).search).filters.courses).toHaveLength(2);
    });

    it('should keep chosen filters when the options are listed again', () => {
        create();
        searchReq().flush(questions);
        component.onTagOpen(true);
        http.expectOne((r) => r.url === '/app/tags').flush([
            { id: 3, name: 'calculus', questions: [{}, {}] },
            { id: 4, name: 'unused', questions: [] },
        ]);
        expect(component.tagOptions().map((o) => o.label)).toEqual(['calculus (2)']);
        component.onFilterOptionSelected(component.tagOptions()[0]);
        searchReq().flush(questions);

        component.onTagOpen(true);
        const again = http.expectOne((r) => r.url === '/app/tags');
        expect(again.request.params.has('tagIds')).toBe(false);
        again.flush([{ id: 3, name: 'calculus', questions: [{}] }]);

        expect(component.tags().map((t) => [t.id, t.filtered])).toEqual([[3, true]]);
    });

    it('should search the loaded questions by text after a pause', () => {
        vi.useFakeTimers();
        create();
        searchReq().flush(questions);

        component.searchForm.text().value.set('integ');
        TestBed.tick();
        vi.advanceTimersByTime(300);

        expect(ids()).toEqual([2]);
    });

    it('should restore stored filters and search with them', () => {
        stored.questionFilters = {
            search: JSON.stringify({
                filters: {
                    courses: [{ id: 5, name: 'Maths', filtered: true }],
                    exams: [],
                    sections: [],
                    tags: [],
                    owners: [],
                    text: 'deriv',
                },
            }),
        };
        create();

        const req = searchReq();
        expect(req.request.params.getAll('courseIds')).toEqual(['5']);
        req.flush(questions);

        expect(component.searchForm.text().value()).toBe('deriv');
        expect(ids()).toEqual([1]);
    });

    describe('owners', () => {
        it('should offer the owners of the listed questions to a teacher', () => {
            create();
            searchReq().flush([...questions, question(3, 'Limits')]);

            component.onOwnerOpen(true);

            expect(component.ownerOptions().map((o) => o.label)).toEqual(['Teppo Testaaja', 'Maija M']);
        });

        it('should offer all teachers, admins and support users to an admin', () => {
            user.isAdmin = true;
            create();
            searchReq().flush(questions);

            component.onOwnerOpen(true);
            http.expectOne('/app/users/byrole/TEACHER').flush([{ id: 1, firstName: 'Teppo', lastName: 'T' }]);
            http.expectOne('/app/users/byrole/ADMIN').flush([{ id: 9, firstName: 'Anna', lastName: 'A' }]);
            http.expectOne('/app/users/byrole/SUPPORT').flush([{ id: 1, firstName: 'Teppo', lastName: 'T' }]);

            expect(component.ownerOptions().map((o) => o.label)).toEqual(['Anna A', 'Teppo T']);
        });
    });

    it('should show exam periods in the exam options', () => {
        create();
        searchReq().flush(questions);
        component.onExamOpen(true);
        http.expectOne((r) => r.url === '/app/examsearch').flush([
            {
                id: 7,
                name: 'Final',
                course: { code: 'MA1' },
                periodStart: '2030-06-01T12:00:00Z',
                periodEnd: '2030-06-30T12:00:00Z',
            },
        ]);

        expect(component.examOptions()[0].label).toBe('MA1 Final (01.06.2030-30.06.2030)');
    });
});
