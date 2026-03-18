// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import type { ClozeTestAnswer } from 'src/app/question/question.model';
import { vi } from 'vitest';
import { ExaminationClozeTestComponent } from './examination-cloze-test.component';

function makeSq(answer: string | null = '{"field1":"value1"}'): ExaminationQuestion {
    return {
        id: 1,
        question: {
            id: 10,
            type: 'ClozeTestQuestion',
            question: '<p>Fill [blank]</p>',
            options: [],
            tags: [],
            questionOwners: [],
            state: 'PUBLISHED',
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
        },
        clozeTestAnswer:
            answer !== null
                ? ({ id: 2, answer, objectVersion: 1, maxScore: 5, question: '' } as ClozeTestAnswer)
                : undefined,
        essayAnswer: undefined,
        options: [],
        evaluationType: 'Points',
        forcedScore: null,
        maxScore: 10,
        derivedMaxScore: 10,
        derivedMinScore: 0,
        selectedOption: 0,
        answered: false,
        expanded: true,
        answerInstructions: '',
        evaluationCriteria: '',
        negativeScoreAllowed: false,
        optionShufflingOn: false,
        sequenceNumber: 1,
        questionStatus: '',
        autosaved: undefined as unknown as Date,
    } as unknown as ExaminationQuestion;
}

describe('ExaminationClozeTestComponent', () => {
    let component: ExaminationClozeTestComponent;
    let fixture: ComponentFixture<ExaminationClozeTestComponent>;
    let mockExamination: { saveTextualAnswer$: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        vi.useFakeTimers();

        mockExamination = {
            saveTextualAnswer$: vi.fn().mockReturnValue(of(makeSq())),
        };

        await TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [provideZonelessChangeDetection(), { provide: ExaminationService, useValue: mockExamination }],
        })
            .overrideComponent(ExaminationClozeTestComponent, {
                set: { template: '<div></div>', imports: [] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ExaminationClozeTestComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('sq', makeSq());
        fixture.componentRef.setInput('examHash', 'exam-hash');
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('autosave interval', () => {
        it('calls saveTextualAnswer$ after 60 seconds when answer is present', () => {
            vi.advanceTimersByTime(60_000);
            expect(mockExamination.saveTextualAnswer$).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1 }),
                'exam-hash',
                { autosave: true, canFail: true, external: false },
            );
        });

        it('sets autosaved signal with current date on successful save', () => {
            const before = new Date();
            vi.advanceTimersByTime(60_000);
            expect(component.autosaved()).toBeInstanceOf(Date);
            expect(component.autosaved()!.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });

        it('does not call save when isPreview is true', () => {
            fixture.componentRef.setInput('isPreview', true);
            vi.advanceTimersByTime(60_000);
            expect(mockExamination.saveTextualAnswer$).not.toHaveBeenCalled();
        });

        it('does not call save when clozeTestAnswer is null', () => {
            fixture.componentRef.setInput('sq', makeSq(null));
            vi.advanceTimersByTime(60_000);
            expect(mockExamination.saveTextualAnswer$).not.toHaveBeenCalled();
        });

        it('does not call save when clozeTestAnswer.answer is empty', () => {
            fixture.componentRef.setInput('sq', makeSq(''));
            vi.advanceTimersByTime(60_000);
            expect(mockExamination.saveTextualAnswer$).not.toHaveBeenCalled();
        });

        it('does not update autosaved signal when save fails', () => {
            mockExamination.saveTextualAnswer$.mockReturnValue(throwError(() => new Error('network error')));
            vi.advanceTimersByTime(60_000);
            expect(component.autosaved()).toBeUndefined();
        });

        it('fires again after each 60 second interval', () => {
            vi.advanceTimersByTime(180_000);
            expect(mockExamination.saveTextualAnswer$).toHaveBeenCalledTimes(3);
        });

        it('passes isExternal flag to saveTextualAnswer$', () => {
            fixture.componentRef.setInput('isExternal', true);
            vi.advanceTimersByTime(60_000);
            expect(mockExamination.saveTextualAnswer$).toHaveBeenCalledWith(
                expect.anything(),
                'exam-hash',
                expect.objectContaining({ external: true }),
            );
        });
    });

    describe('autosaved signal starts undefined', () => {
        it('is undefined before any autosave fires', () => {
            expect(component.autosaved()).toBeUndefined();
        });
    });
});
