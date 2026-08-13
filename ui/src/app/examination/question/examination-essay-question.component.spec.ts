// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import type { Examination, ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import type { EssayAnswer } from 'src/app/question/question.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import { vi } from 'vitest';
import { ExaminationEssayQuestionComponent } from './examination-essay-question.component';

type EssaySq = Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer };

function makeSq(answer: string | null = 'typed answer'): EssaySq {
    return {
        id: 1,
        question: {
            id: 10,
            type: 'EssayQuestion',
            question: '<p>Q?</p>',
            options: [],
            tags: [],
            questionOwners: [],
            state: 'PUBLISHED',
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
        },
        essayAnswer: { id: 1, answer: answer as string, objectVersion: 1 } as EssayAnswer,
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
    } as unknown as EssaySq;
}

function makeExam(hash = 'exam-hash'): Examination {
    return { id: 1, hash, external: false } as unknown as Examination;
}

describe('ExaminationEssayQuestionComponent', () => {
    let component: ExaminationEssayQuestionComponent;
    let fixture: ComponentFixture<ExaminationEssayQuestionComponent>;
    let mockExamination: { saveTextualAnswer$: ReturnType<typeof vi.fn>; setAnswerStatus: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        vi.useFakeTimers();

        mockExamination = {
            saveTextualAnswer$: vi.fn().mockReturnValue(of(makeSq())),
            setAnswerStatus: vi.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: ExaminationService, useValue: mockExamination },
                { provide: AttachmentService, useValue: {} },
                { provide: FileService, useValue: {} },
                { provide: ToastrService, useValue: { error: vi.fn(), success: vi.fn() } },
            ],
        })
            .overrideComponent(ExaminationEssayQuestionComponent, {
                set: { template: '<div></div>', imports: [] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ExaminationEssayQuestionComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('sq', makeSq());
        fixture.componentRef.setInput('exam', makeExam());
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

        it('does not call save when answer is empty', () => {
            fixture.componentRef.setInput('sq', makeSq(''));
            vi.advanceTimersByTime(60_000);
            expect(mockExamination.saveTextualAnswer$).not.toHaveBeenCalled();
        });

        it('does not call save when essayAnswer is null', () => {
            const sqWithoutAnswer = { ...makeSq(), essayAnswer: null } as unknown as EssaySq;
            fixture.componentRef.setInput('sq', sqWithoutAnswer);
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
    });

    describe('autosaved signal starts undefined', () => {
        it('is undefined before any autosave fires', () => {
            expect(component.autosaved()).toBeUndefined();
        });
    });
});
