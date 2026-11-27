// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import type { Question, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { vi } from 'vitest';
import { QuestionComponent } from './question.component';

/** Collaborative exam questions use IOP ids; saving must not hit /app/questions — only the modal emits. */
describe('QuestionComponent collaborative modal save', () => {
    let fixture: ComponentFixture<QuestionComponent>;
    let updateQuestion$: ReturnType<typeof vi.fn>;
    let createQuestion$: ReturnType<typeof vi.fn>;
    const sessionUser = { id: 1, firstName: 'T', lastName: 'eacher', email: 't@school.fi' } as User;

    beforeEach(async () => {
        updateQuestion$ = vi.fn();
        createQuestion$ = vi.fn();
        await TestBed.configureTestingModule({
            imports: [QuestionComponent],
            providers: [
                provideZonelessChangeDetection(),
                { provide: Router, useValue: { navigate: vi.fn() } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: { get: () => null },
                            queryParamMap: { get: () => null },
                            data: {},
                        },
                    },
                },
                { provide: ToastrService, useValue: { error: vi.fn() } },
                {
                    provide: QuestionService,
                    useValue: {
                        getQuestion: vi.fn(),
                        createQuestion$: createQuestion$,
                        updateQuestion$: updateQuestion$,
                    },
                },
                { provide: SessionService, useValue: { getUser: () => sessionUser } },
            ],
        })
            .overrideComponent(QuestionComponent, {
                set: { template: '', imports: [TranslateModule] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(QuestionComponent);
    });

    it('should emit saved without calling QuestionService when collaborative and modal', () => {
        const iopQuestion = {
            id: 7091489458022090,
            type: 'EssayQuestion',
            question: 'Text',
            options: [],
            tags: [],
            questionOwners: [sessionUser],
            examSectionQuestions: [],
            state: 'DRAFT',
            defaultMaxScore: 6,
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
        } as unknown as ReverseQuestion;

        fixture.componentRef.setInput('question', iopQuestion);
        fixture.componentRef.setInput('collaborative', true);
        fixture.componentRef.setInput('isModalContext', true);
        fixture.detectChanges();

        const savedPayload: (Question | ReverseQuestion)[] = [];
        fixture.componentInstance.saved.subscribe((q) => savedPayload.push(q));

        const updated: Question = {
            ...iopQuestion,
            question: 'Updated',
        } as Question;

        (fixture.componentInstance as unknown as { saveToServer: (q: Question) => void }).saveToServer(updated);

        expect(updateQuestion$).not.toHaveBeenCalled();
        expect(createQuestion$).not.toHaveBeenCalled();
        expect(savedPayload).toHaveLength(1);
        expect(savedPayload[0].question).toBe('Updated');
        expect((savedPayload[0] as ReverseQuestion).examSectionQuestions).toEqual([]);
    });

    it('should still call updateQuestion$ for non-collaborative modal (library question)', () => {
        updateQuestion$.mockReturnValue(of({ id: 1, question: 'Saved' } as Question));

        const q = {
            id: 1,
            type: 'EssayQuestion',
            question: 'Text',
            options: [],
            tags: [],
            questionOwners: [sessionUser],
            examSectionQuestions: [],
            state: 'DRAFT',
            defaultMaxScore: 1,
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
        } as unknown as ReverseQuestion;

        fixture.componentRef.setInput('question', q);
        fixture.componentRef.setInput('collaborative', false);
        fixture.componentRef.setInput('isModalContext', true);
        fixture.detectChanges();

        (fixture.componentInstance as unknown as { saveToServer: (q: Question) => void }).saveToServer(q as Question);

        expect(updateQuestion$).toHaveBeenCalled();
    });
});
