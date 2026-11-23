// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import type { Exam, ExamLanguage, ExamType, GradeScale, SelectableGrade } from 'src/app/exam/exam.model';
import type { ExamService } from 'src/app/exam/exam.service';
import type { AssessmentService } from 'src/app/review/assessment/assessment.service';
import type { LanguageService } from 'src/app/shared/language/language.service';
import type { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import type { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { GradingBaseComponent } from './grading-base.component';

const scale = (id: number): GradeScale =>
    ({
        id,
        grades: [
            { id: id * 10 + 1, name: 'REJECTED', marksRejection: true },
            { id: id * 10 + 2, name: 'APPROVED', marksRejection: false },
        ],
    }) as unknown as GradeScale;

const final = { id: 2, type: 'FINAL' } as ExamType;
const partial = { id: 1, type: 'PARTIAL' } as ExamType;
const fi = { code: 'fi', name: 'suomi' } as ExamLanguage;
const sv = { code: 'sv', name: 'svenska' } as ExamLanguage;

/** The shared grading logic, without a template */
class Grading extends GradingBaseComponent {
    exam = {} as Exam;
    getExam = () => this.exam;
    grades$ = (maturity = false, collaborative = false) => this.initGrades(maturity, collaborative);
    creditTypes$ = () => this.initCreditTypes();
    languages$ = () => this.initLanguages();
}

describe('GradingBaseComponent', () => {
    const assessment = { pickExamLanguage: vi.fn() };
    const examService = { refreshExamTypes$: vi.fn(() => of([partial, final].map((t) => ({ ...t, name: t.type })))) };
    const commonExam = {
        getExamGradeDisplayName: vi.fn((name: string) => `display:${name}`),
        hasCustomCredit: vi.fn(() => false),
    };
    const language = { getExamLanguages$: vi.fn(() => of([fi, sv])) };
    let grading: Grading;

    beforeEach(() => {
        vi.clearAllMocks();
        commonExam.hasCustomCredit.mockReturnValue(false);
        assessment.pickExamLanguage.mockReturnValue(undefined);
        grading = new Grading(
            {} as HttpClient,
            {} as ToastService,
            assessment as unknown as AssessmentService,
            examService as unknown as ExamService,
            commonExam as unknown as CommonExamService,
            language as unknown as LanguageService,
        );
    });

    const types = () => grading.grades().map((g) => g.type);
    const selected = () => grading.gradingForm.controls.grade.value;

    describe('the grades on offer', () => {
        it('come from the exam, then its parent, then the course', () => {
            grading.exam = { gradeScale: scale(1), parent: { gradeScale: scale(2) } } as unknown as Exam;
            grading.grades$();
            expect(grading.grades()[0].id).toBe(11);

            grading.exam = { parent: { gradeScale: scale(2) }, course: { gradeScale: scale(3) } } as unknown as Exam;
            grading.grades$();
            expect(grading.grades()[0].id).toBe(21);

            grading.exam = { course: { gradeScale: scale(3) } } as unknown as Exam;
            grading.grades$();
            expect(grading.grades()[0].id).toBe(31);
        });

        it('cannot be worked out without any grade scale', () => {
            grading.exam = { course: {} } as unknown as Exam;
            expect(() => grading.grades$()).toThrow('No GradeScale for Assessment!');
        });

        it('are named for display and add point grading and no grading', () => {
            grading.exam = { gradeScale: scale(1) } as Exam;
            grading.grades$();
            expect(types()).toEqual(['REJECTED', 'APPROVED', 'POINT_GRADED', 'NOT_GRADED']);
            expect(grading.grades()[1].name).toBe('display:APPROVED');
        });

        it('leave out point grading for maturity tests and collaborative exams', () => {
            grading.exam = { gradeScale: scale(1) } as Exam;
            grading.grades$(true, false);
            expect(types()).toEqual(['REJECTED', 'APPROVED', 'NOT_GRADED']);
            grading.grades$(false, true);
            expect(types()).toEqual(['REJECTED', 'APPROVED', 'NOT_GRADED']);
        });
    });

    describe('the grade shown at first', () => {
        it('is the one the exam has', () => {
            grading.exam = { gradeScale: scale(1), grade: { id: 12, name: 'APPROVED' } } as unknown as Exam;
            grading.grades$();
            expect(selected()?.type).toBe('APPROVED');
        });

        it('is no grading or point grading when the exam was graded so', () => {
            grading.exam = { gradeScale: scale(1), gradingType: 'NOT_GRADED' } as unknown as Exam;
            grading.grades$();
            expect(selected()?.type).toBe('NOT_GRADED');

            grading = new Grading(
                {} as HttpClient,
                {} as ToastService,
                assessment as unknown as AssessmentService,
                examService as unknown as ExamService,
                commonExam as unknown as CommonExamService,
                language as unknown as LanguageService,
            );
            grading.exam = { gradeScale: scale(1), gradingType: 'POINT_GRADED' } as unknown as Exam;
            grading.grades$();
            expect(selected()?.type).toBe('POINT_GRADED');
        });

        it('is none for an exam not graded yet', () => {
            grading.exam = { gradeScale: scale(1), gradingType: 'GRADED' } as unknown as Exam;
            grading.grades$();
            expect(selected()).toBeNull();
        });
    });

    describe('choosing a grade', () => {
        const choose = (grade: SelectableGrade | null) => {
            grading.gradingForm.controls.grade.setValue(grade);
            grading.setGrade();
        };

        beforeEach(() => {
            grading.exam = { gradeScale: scale(1) } as Exam;
            grading.grades$();
        });

        it('grades the exam with a grade of its scale', () => {
            choose(grading.grades()[1]);
            expect(grading.exam.grade?.id).toBe(12);
            expect(grading.exam.gradingType).toBe('GRADED');
        });

        it('marks the exam not graded or point graded', () => {
            choose(grading.grades().find((g) => g.type === 'NOT_GRADED')!);
            expect(grading.exam.gradingType).toBe('NOT_GRADED');
            choose(grading.grades().find((g) => g.type === 'POINT_GRADED')!);
            expect(grading.exam.gradingType).toBe('POINT_GRADED');
        });

        it('clears the grade when the empty option is picked', () => {
            choose(grading.grades()[1]);
            choose(null);
            expect(grading.exam.grade).toBeUndefined();
            expect(grading.exam.gradingType).toBe('GRADED');
        });
    });

    describe('credit type', () => {
        it('falls back on the exam type, taking the listed one', () => {
            grading.exam = { examType: { id: 2, type: 'FINAL' } } as unknown as Exam;
            grading.creditTypes$();
            expect(grading.creditTypes().map((t) => t.type)).toEqual(['PARTIAL', 'FINAL']);
            expect(grading.exam.creditType).toBe(grading.creditTypes()[1]);
            expect(grading.gradingForm.controls.type.value).toBe(grading.creditTypes()[1]);
        });

        it('keeps the one set over the exam type', () => {
            grading.exam = { creditType: { id: 1, type: 'PARTIAL' }, examType: final } as unknown as Exam;
            grading.creditTypes$();
            expect(grading.exam.creditType?.type).toBe('PARTIAL');
        });

        it('is set and cleared from the form', () => {
            grading.exam = {} as Exam;
            grading.gradingForm.controls.type.setValue(final);
            grading.setCreditType();
            expect(grading.exam.creditType).toBe(final);
            grading.gradingForm.controls.type.setValue(null);
            grading.setCreditType();
            expect(grading.exam.creditType).toBeUndefined();
        });
    });

    describe('credits', () => {
        it('default to the course credits unless set for the exam', () => {
            grading.exam = { examType: final, course: { credits: 5 } } as unknown as Exam;
            grading.creditTypes$();
            expect(grading.exam.customCredit).toBe(5);

            commonExam.hasCustomCredit.mockReturnValue(true);
            grading.exam = { examType: final, course: { credits: 5 }, customCredit: 3 } as unknown as Exam;
            grading.creditTypes$();
            expect(grading.exam.customCredit).toBe(3);
        });

        it('are taken from the form, but not cleared by an empty field', () => {
            grading.exam = { customCredit: 3 } as Exam;
            grading.gradingForm.controls.customCredit.setValue(4);
            grading.setCustomCredit();
            expect(grading.exam.customCredit).toBe(4);
            grading.gradingForm.controls.customCredit.setValue(null);
            grading.setCustomCredit();
            expect(grading.exam.customCredit).toBe(4);
        });
    });

    describe('answer language', () => {
        it('defaults to the one the assessment picks, and is shown', () => {
            assessment.pickExamLanguage.mockReturnValue(sv);
            grading.exam = {} as Exam;
            grading.languages$();
            expect(grading.exam.answerLanguage).toBe('sv');
            expect(grading.gradingForm.controls.language.value).toBe(sv);
            expect(grading.languages()).toEqual([fi, sv]);
        });

        it('keeps one already chosen', () => {
            assessment.pickExamLanguage.mockReturnValue(sv);
            grading.exam = { answerLanguage: 'fi' } as Exam;
            grading.languages$();
            expect(grading.exam.answerLanguage).toBe('fi');
        });

        it('is set and cleared from the form', () => {
            grading.exam = {} as Exam;
            grading.gradingForm.controls.language.setValue(fi);
            grading.setLanguage();
            expect(grading.exam.answerLanguage).toBe('fi');
            grading.gradingForm.controls.language.setValue(null);
            grading.setLanguage();
            expect(grading.exam.answerLanguage).toBeUndefined();
        });
    });
});
