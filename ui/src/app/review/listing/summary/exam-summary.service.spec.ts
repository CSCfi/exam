// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import type { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam, ExamSection } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { ExamSummaryService } from './exam-summary.service';

describe('ExamSummaryService', () => {
    let service: ExamSummaryService;
    let http: HttpTestingController;

    // Scores come straight from the section in these tests
    type Scored = ExamSection & { max: number; total: number };
    const section = (name: string, max: number, total = 0) => ({ name, max, total }) as unknown as ExamSection;
    const review = (sections: ExamSection[], exam: Partial<Exam> = {}) =>
        ({ exam: { examSections: sections, ...exam } }) as unknown as ExamParticipation;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: ExamService,
                    useValue: {
                        getSectionMaxScore: (s: Scored) => s.max,
                        getSectionTotalScore: (s: Scored) => s.total,
                    },
                },
            ],
        });
        service = TestBed.inject(ExamSummaryService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should collect section totals capped at the section max', () => {
        const exam = { examSections: [section('A', 10), section('B', 5)] } as Exam;
        const reviews = [review([section('A', 10, 7), section('B', 5, 9)]), review([section('A', 10, 3)])];

        expect(service.calcSectionMaxAndAverages(reviews, exam)).toEqual({
            A: { max: 10, totals: [7, 3] },
            B: { max: 5, totals: [5] },
        });
    });

    it('should take the max of sections missing from the parent from its children', () => {
        const exam = { examSections: [] as ExamSection[] } as Exam;
        const reviews = [review([section('Old', 4, 2)]), review([section('Old', 6, 6)])];

        expect(service.calcSectionMaxAndAverages(reviews, exam)).toEqual({ Old: { max: 6, totals: [2, 6] } });
    });

    it('should list the grades of graded reviews', () => {
        const reviews = [
            review([], { gradedTime: new Date(), grade: { name: '5' } as Exam['grade'] }),
            review([], { gradedTime: new Date() }),
            review([]),
        ];

        expect(service.getGrades(reviews)).toEqual(['5', 'i18n_no_grading']);
    });

    it('should fetch no-shows except for collaborative exams', async () => {
        expect(await firstValueFrom(service.getNoShows$(true, { id: 5 } as Exam))).toEqual([]);

        const done = firstValueFrom(service.getNoShows$(false, { id: 5 } as Exam));
        http.expectOne('/app/noshows/5').flush([{ id: 1 }]);
        expect(await done).toEqual([{ id: 1 }]);
    });
});
