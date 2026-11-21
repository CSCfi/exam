// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { ChartService } from './chart.service';

// The charts need a canvas, which jsdom lacks; the figures behind them are tested instead
describe('ChartService', () => {
    let service: ChartService;

    type Answer = { score: number; approved?: boolean } | null;
    const sq = (parentId: number, answer: Answer, max = 10) => ({
        question: { parent: { id: parentId } },
        answer,
        max,
    });
    const review = (sqs: ReturnType<typeof sq>[], extra: object = {}) =>
        ({ exam: { examSections: [{ sectionQuestions: sqs }] }, ...extra }) as unknown as ExamParticipation;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: { warning: vi.fn(), error: vi.fn() } },
                { provide: ExamService, useValue: { getMaxScore: () => 10 } },
                {
                    provide: QuestionScoringService,
                    useValue: {
                        calculateMaxScore: (q: { max: number }) => q.max,
                        calculateAnswerScore: (q: { answer: Answer }) => q.answer,
                    },
                },
            ],
        });
        service = TestBed.inject(ChartService);
    });

    describe('question figures', () => {
        const figures = (reviews: ExamParticipation[]) => service['calculateQuestionData'](reviews);

        it('should give max, average, median and approval rate per question', () => {
            const reviews = [
                review([sq(1, { score: 2 }), sq(2, { score: 0, approved: true })]),
                review([sq(1, { score: 10 }), sq(2, { score: 0 })]),
                review([sq(1, { score: 3 }), sq(2, null)]),
            ];

            expect(figures(reviews)).toEqual([
                { question: '1', max: 10, avg: 5, median: 3, approvalRate: 1 },
                { question: '2', max: 10, avg: 0, median: 0, approvalRate: 0.5 },
            ]);
        });

        it('should average the middle pair of an even count', () => {
            const reviews = [9, 1, 10, 2].map((score) => review([sq(1, { score })]));
            expect(figures(reviews)[0].median).toBe(5.5);
        });
    });

    it('should count grades with ungraded ones as no grading', () => {
        const graded = (name?: string) =>
            ({ exam: { gradedTime: new Date(), grade: name ? { name } : undefined } }) as unknown as ExamParticipation;

        expect(
            service['calculateGradeDistribution']([
                graded('3'),
                graded('3'),
                graded(),
                { exam: {} } as ExamParticipation,
            ]),
        ).toEqual({ data: [2, 1], labels: ['3', 'i18n_no_grading'] });
    });

    it('should plot score by time used without reordering the given list', () => {
        const timed = (minutes: number, totalScore: number) =>
            ({
                started: '2030-06-12T08:00:00Z',
                ended: DateTime.fromISO('2030-06-12T08:00:00Z').plus({ minutes }).toISO(),
                exam: { totalScore },
            }) as unknown as ExamParticipation;
        const reviews = [timed(90, 4), timed(30, 8)];

        expect(service['calculateGradeTimeValues'](reviews)).toEqual([
            { x: 30, y: 8 },
            { x: 90, y: 4 },
        ]);
        expect(reviews[0].exam.totalScore).toBe(4);
    });

    it('should count exams done by each day of the period', () => {
        const start = DateTime.now().minus({ days: 2 }).startOf('day');
        const done = (day: number) => ({ ended: start.plus({ days: day, hours: 12 }).toISO() }) as ExamParticipation;
        const exam = { periodStart: start.toISO(), periodEnd: DateTime.now().plus({ days: 5 }).toISO() } as Exam;

        const values = service['calculateExaminationTimeValues']([done(0), done(1), done(1)], exam);

        // Up to today only
        expect(values.map((v) => v.date)).toEqual([0, 1, 2]);
        expect(values.map((v) => v.amount)).toEqual([1, 3, 3]);
    });
});
