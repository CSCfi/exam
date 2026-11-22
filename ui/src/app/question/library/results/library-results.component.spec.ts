// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { LibraryService } from 'src/app/question/library/library.service';
import type { LibraryQuestion } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { LibraryResultsComponent } from './library-results.component';

describe('LibraryResultsComponent', () => {
    let component: LibraryResultsComponent;
    let fixture: ComponentFixture<LibraryResultsComponent>;
    let http: HttpTestingController;
    let selected: number[][];
    let updated: LibraryQuestion[][];
    let filters: Record<string, unknown>;
    const toast = { info: vi.fn(), error: vi.fn() };
    const me = { id: 1, firstName: 'Teppo', lastName: 'Testaaja', isAdmin: false } as User;
    const other = { id: 2, firstName: 'Maija', lastName: 'M', userIdentifier: 'm1' } as User;

    const question = (id: number) =>
        ({
            id,
            type: 'EssayQuestion',
            questionOwners: [me, other],
            tags: [
                { name: 'mine', creator: { id: 1 } },
                { name: 'theirs', creator: { id: 2 } },
            ],
        }) as unknown as LibraryQuestion;
    const list = (n: number, from = 1) => Array.from({ length: n }, (_, i) => question(from + i));

    const create = (questions: LibraryQuestion[]) => {
        fixture = TestBed.createComponent(LibraryResultsComponent);
        component = fixture.componentInstance;
        selected = [];
        updated = [];
        component.selected.subscribe((s) => selected.push(s));
        component.updated.subscribe((u) => updated.push(u));
        fixture.componentRef.setInput('questions', questions);
        fixture.detectChanges();
    };
    const setQuestions = (questions: LibraryQuestion[]) => {
        fixture.componentRef.setInput('questions', questions);
        fixture.detectChanges();
    };
    const check = (index: number, checked = true) =>
        component.onQuestionToggle(component.fixedQuestions()[index], { target: { checked } } as unknown as Event);

    beforeEach(() => {
        vi.clearAllMocks();
        filters = {};
        TestBed.configureTestingModule({
            imports: [LibraryResultsComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: SessionService, useValue: { getUser: () => me } },
                { provide: ConfirmationDialogService, useValue: { open$: vi.fn(() => of(true)) } },
                { provide: AttachmentService, useValue: { downloadQuestionAttachment: vi.fn() } },
                {
                    provide: LibraryService,
                    useValue: {
                        loadFilters: (c: string) => filters[c] ?? {},
                        storeFilters: (f: unknown, c: string) => (filters[c] = { filters: f }),
                    },
                },
            ],
        });
        TestBed.overrideComponent(LibraryResultsComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('selection', () => {
        it('should pass on the checked questions', () => {
            create(list(3));
            check(0);
            check(2);
            expect(selected.at(-1)).toEqual([1, 3]);
            expect(component.allSelected()).toBe(false);
        });

        it('should select all and none', () => {
            create(list(3));

            component.onSelectAll({ target: { checked: true } } as unknown as Event);
            expect(selected.at(-1)).toEqual([1, 2, 3]);
            expect(component.allSelected()).toBe(true);

            component.onSelectAll({ target: { checked: false } } as unknown as Event);
            expect(selected.at(-1)).toEqual([]);
        });

        it('should keep the choices of questions still listed after an update', () => {
            create(list(3));
            check(0);
            check(1);

            setQuestions([question(2), question(3), question(4)]);

            expect(component.fixedQuestions().map((q) => [q.id, q.selected])).toEqual([
                [2, true],
                [3, false],
                [4, false],
            ]);
            expect(selected.at(-1)).toEqual([2]);
        });
    });

    describe('paging', () => {
        it('should stay on the page when a question is removed, copied or updated', () => {
            create(list(60));
            component.pageSelected({ page: 2 });

            setQuestions(list(59));
            expect(component.currentPage()).toBe(2);
            setQuestions([...list(59), question(100)]);
            expect(component.currentPage()).toBe(2);
            setQuestions([...list(59), question(100)]);
            expect(component.currentPage()).toBe(2);
        });

        it('should not stay past the last page', () => {
            create(list(51));
            component.pageSelected({ page: 2 });

            setQuestions(list(50));
            expect(component.currentPage()).toBe(1);
        });

        it('should go back to the first page for a new result set', () => {
            create(list(60));
            component.pageSelected({ page: 2 });

            setQuestions(list(55));
            expect(component.currentPage()).toBe(0);
        });
    });

    it('should remove a question from the library', () => {
        create(list(3));

        component.deleteQuestion(component.fixedQuestions()[1]);
        http.expectOne('/app/questions/2').flush(null);

        expect(updated.at(-1)?.map((q) => q.id)).toEqual([1, 3]);
        expect(toast.info).toHaveBeenCalledWith('i18n_question_removed');
    });

    it('should show why removing failed', () => {
        create(list(3));

        component.deleteQuestion(component.fixedQuestions()[1]);
        http.expectOne('/app/questions/2').flush('i18n_error_access_forbidden', {
            status: 403,
            statusText: 'Forbidden',
        });

        expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
        expect(updated).toEqual([]);
    });

    it('should put a copy right before the original', () => {
        create(list(3));
        const copied = vi.fn();
        component.copied.subscribe(copied);

        component.copyQuestion(component.fixedQuestions()[1]);
        http.expectOne('/app/question/2').flush(question(9));

        expect(updated.at(-1)?.map((q) => q.id)).toEqual([1, 9, 2, 3]);
        expect(copied).toHaveBeenCalledWith(question(9));
    });

    describe('sorting', () => {
        it('should start newest first and flip on the same column', () => {
            create([]);
            expect([component.questionsPredicate(), component.reverse()]).toEqual(['created', true]);

            component.setPredicate('created');
            expect(component.reverse()).toBe(false);
            component.setPredicate('typeOrd');
            expect([component.questionsPredicate(), component.reverse()]).toEqual(['typeOrd', false]);
        });

        it('should remember the order', () => {
            create([]);
            component.setPredicate('typeOrd');

            create([]);
            expect(component.questionsPredicate()).toBe('typeOrd');
        });
    });

    describe('display', () => {
        beforeEach(() => create([]));

        it('should show only own tags and the other owners', () => {
            expect(component.printTags(question(1))).toBe('mine');
            expect(component.getOwnersToDisplay(question(1))).toEqual([other]);
            expect(component.printOwners(question(1))).toBe('Teppo Testaaja, Maija M');
            expect(component.printOwner(other, true)).toBe('Maija M (m1)');
        });

        it('should show a score or a translated label', () => {
            expect(component.showDisplayedScoreOrTranslate(3)).toBe(3);
            expect(component.showDisplayedScoreOrTranslate('i18n_evaluation_select')).toBe('i18n_evaluation_select');
            expect(component.showDisplayedScoreOrTranslate('')).toBe('');
        });
    });
});
