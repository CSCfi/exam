// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { EssayAnswer } from 'src/app/question/question.model';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExaminationQuestion } from './examination.model';
import { ExaminationService } from './examination.service';

const essayQuestion = (answer?: string) =>
    ({
        id: 1,
        question: { id: 10, type: 'EssayQuestion' },
        essayAnswer: answer !== undefined ? ({ id: 1, answer, objectVersion: 1 } as EssayAnswer) : undefined,
        options: [],
    }) as unknown as ExaminationQuestion;

describe('ExaminationService.isAnswered (essay)', () => {
    let service: ExaminationService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: ToastrService, useValue: { info: vi.fn(), error: vi.fn() } },
            ],
        });
        service = TestBed.inject(ExaminationService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('treats missing, empty and markup-only answers as unanswered', () => {
        expect(service.isAnswered(essayQuestion())).toBeFalsy();
        expect(service.isAnswered(essayQuestion(''))).toBeFalsy();
        expect(service.isAnswered(essayQuestion('<p></p>'))).toBeFalsy();
    });

    it('treats answers with text or math as answered', () => {
        expect(service.isAnswered(essayQuestion('<p>Answer</p>'))).toBeTruthy();
        expect(service.isAnswered(essayQuestion('<span class="math-tex">\\(x\\)</span>'))).toBeTruthy();
    });

    it('parses an unchanged answer only once across repeated checks', () => {
        const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
        const sq = essayQuestion('<p>Answer</p>');
        for (let i = 0; i < 50; i++) service.isAnswered(sq);
        expect(parse).toHaveBeenCalledTimes(1);
    });

    it('re-evaluates when the answer text changes', () => {
        const parse = vi.spyOn(DOMParser.prototype, 'parseFromString');
        const sq = essayQuestion('<p>Answer</p>');
        expect(service.isAnswered(sq)).toBeTruthy();
        sq.essayAnswer!.answer = '<p></p>';
        expect(service.isAnswered(sq)).toBeFalsy();
        sq.essayAnswer!.answer = '<p>Again</p>';
        expect(service.isAnswered(sq)).toBeTruthy();
        expect(parse).toHaveBeenCalledTimes(3);
    });
});
