// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import type { Course, Exam, GradeScale } from 'src/app/exam/exam.model';
import { CommonExamService } from './common-exam.service';

function makeExam(overrides: Partial<Exam> = {}): Exam {
    return { id: 1, examSections: [], ...overrides } as Exam;
}

describe('CommonExamService', () => {
    let service: CommonExamService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [{ provide: DOCUMENT, useValue: document }],
        });
        service = TestBed.inject(CommonExamService);
    });

    describe('hasCustomCredit', () => {
        it('should return true when customCredit is a non-negative number', () => {
            expect(service.hasCustomCredit(makeExam({ customCredit: 0 }))).toBe(true);
            expect(service.hasCustomCredit(makeExam({ customCredit: 5 }))).toBe(true);
        });

        it('should return false when customCredit is undefined', () => {
            expect(service.hasCustomCredit(makeExam({ customCredit: undefined }))).toBe(false);
        });

        it('should return false when customCredit is negative', () => {
            expect(service.hasCustomCredit(makeExam({ customCredit: -1 }))).toBe(false);
        });

        it('should return false when customCredit is NaN', () => {
            expect(service.hasCustomCredit(makeExam({ customCredit: NaN }))).toBe(false);
        });
    });

    describe('getCredit', () => {
        it('should return customCredit when it is set', () => {
            const exam = makeExam({ customCredit: 3, course: { credits: 5 } as unknown as Course });
            expect(service.getCredit(exam)).toBe(3);
        });

        it('should return course credits when there is no customCredit', () => {
            const exam = makeExam({ customCredit: undefined, course: { credits: 5 } as unknown as Course });
            expect(service.getCredit(exam)).toBe(5);
        });

        it('should return 0 when neither customCredit nor course credits exist', () => {
            const exam = makeExam({ customCredit: undefined, course: undefined });
            expect(service.getCredit(exam)).toBe(0);
        });

        it('should use customCredit of 0 over course credits', () => {
            const exam = makeExam({ customCredit: 0, course: { credits: 5 } as unknown as Course });
            expect(service.getCredit(exam)).toBe(0);
        });
    });

    describe('getExamGradeDisplayName', () => {
        const scale = (description: string) => ({ description }) as GradeScale;

        it('should map Latin grade codes to full names in the Latin scale', () => {
            const latin = scale('LATIN');
            expect(service.getExamGradeDisplayName('I', latin)).toBe('Improbatur');
            expect(service.getExamGradeDisplayName('A', latin)).toBe('Approbatur');
            expect(service.getExamGradeDisplayName('B', latin)).toBe('Lubenter approbatur');
            expect(service.getExamGradeDisplayName('N', latin)).toBe('Non sine laude approbatur');
            expect(service.getExamGradeDisplayName('C', latin)).toBe('Cum laude approbatur');
            expect(service.getExamGradeDisplayName('M', latin)).toBe('Magna cum laude approbatur');
            expect(service.getExamGradeDisplayName('E', latin)).toBe('Eximia cum laude approbatur');
            expect(service.getExamGradeDisplayName('L', latin)).toBe('Laudatur');
        });

        it('should keep Latin-looking grades of other scales as they are', () => {
            expect(service.getExamGradeDisplayName('E', scale('OTHER'))).toBe('E');
            expect(service.getExamGradeDisplayName('L', scale('OTHER'))).toBe('L');
        });

        it('should keep grades as they are when the scale is unknown', () => {
            expect(service.getExamGradeDisplayName('E')).toBe('E');
        });

        it('should return the grade string as-is for unknown grades', () => {
            expect(service.getExamGradeDisplayName('UNKNOWN_GRADE', scale('LATIN'))).toBe('UNKNOWN_GRADE');
        });
    });

    describe('resolveGradeScale', () => {
        const own = { id: 1 } as GradeScale;
        const parents = { id: 2 } as GradeScale;
        const courses = { id: 3 } as GradeScale;

        it('should prefer the exam scale, then the parent scale, then the course scale', () => {
            const course = { gradeScale: courses } as Course;
            const parent = makeExam({ gradeScale: parents });
            expect(service.resolveGradeScale(makeExam({ gradeScale: own, parent, course }))).toBe(own);
            expect(service.resolveGradeScale(makeExam({ parent, course }))).toBe(parents);
            expect(service.resolveGradeScale(makeExam({ parent: null, course }))).toBe(courses);
        });

        it('should return undefined when there is no exam or scale', () => {
            expect(service.resolveGradeScale(undefined)).toBeUndefined();
            expect(service.resolveGradeScale(makeExam({ parent: null }))).toBeUndefined();
        });
    });

    describe('countWords', () => {
        it('should return 0 for undefined input', () => {
            expect(service.countWords(undefined)).toBe(0);
        });

        it('should return 0 for empty string', () => {
            expect(service.countWords('')).toBe(0);
        });

        it('should count simple space-separated words', () => {
            expect(service.countWords('hello world foo')).toBe(3);
        });

        it('should not count extra whitespace as words', () => {
            expect(service.countWords('  hello   world  ')).toBe(2);
        });

        it('should count words after stripping HTML tags', () => {
            expect(service.countWords('<p>hello <strong>world</strong></p>')).toBe(2);
        });

        it('should treat &nbsp; as a space, not a word character', () => {
            expect(service.countWords('hello&nbsp;world')).toBe(2);
        });

        it('should handle newlines between words', () => {
            expect(service.countWords('hello\nworld')).toBe(2);
        });
    });

    describe('countCharacters', () => {
        it('should return 0 for undefined input', () => {
            expect(service.countCharacters(undefined)).toBe(0);
        });

        it('should return 0 for empty string', () => {
            expect(service.countCharacters('')).toBe(0);
        });

        it('should count only non-whitespace characters', () => {
            expect(service.countCharacters('hello world')).toBe(10);
        });

        it('should strip HTML tags before counting', () => {
            expect(service.countCharacters('<p>abc</p>')).toBe(3);
        });

        it('should not count &nbsp; as characters', () => {
            expect(service.countCharacters('&nbsp;')).toBe(0);
        });

        it('should not count newlines as characters', () => {
            expect(service.countCharacters('a\nb')).toBe(2);
        });
    });
});
