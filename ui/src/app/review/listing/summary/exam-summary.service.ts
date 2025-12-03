// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';

@Injectable({ providedIn: 'root' })
export class ExamSummaryService {
    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private Exam = inject(ExamService);

    getNoShows$ = (collaborative: boolean, exam: Exam) => {
        if (collaborative) {
            //TODO: Fetch collaborative no-shows from xm.
            return of([]);
        } else {
            return this.http.get<ExamEnrolment[]>(`/app/noshows/${exam.id}`);
        }
    };

    getGrades = (reviews: ExamParticipation[]): string[] =>
        reviews
            .filter((r) => r.exam.gradedTime)
            .map((r) => (r.exam.grade ? r.exam.grade.name : this.translate.instant('i18n_no_grading')));

    calcSectionMaxAndAverages = (reviews: ExamParticipation[], exam: Exam) => {
        const parentSectionMaxScores: Record<string, number> = exam.examSections.reduce(
            (obj, current) => ({
                ...obj,
                [current.name]: this.Exam.getSectionMaxScore(current),
            }),
            {},
        );
        const childExamSections = reviews.flatMap((r) => r.exam.examSections);

        /* Get section max scores from child exams as well, in case sections got renamed/deleted from parent */
        const childSectionMaxScores = reviews
            .flatMap((r) => r.exam.examSections)
            .filter((es) => !parentSectionMaxScores[es.name])
            .reduce(
                (obj, current) => {
                    const prevMax = obj[current.name] || 0;
                    const newMax = this.Exam.getSectionMaxScore(current);
                    return { ...obj, [current.name]: Math.max(prevMax, newMax) };
                },
                {} as Record<string, number>,
            );

        const sectionMaxScores = { ...childSectionMaxScores, ...parentSectionMaxScores };

        const sectionTotalScores: Record<string, number[]> = childExamSections.reduce(
            (obj, curr) => {
                const { name } = curr;
                const max = sectionMaxScores[name] || 0;
                const score = Math.min(this.Exam.getSectionTotalScore(curr), max);
                const scores = obj[name] || [];
                return { ...obj, [name]: [...scores, score] };
            },
            {} as Record<string, number[]>,
        );

        return Object.keys(sectionMaxScores).reduce(
            (obj, name) => ({
                ...obj,
                [name]: {
                    max: sectionMaxScores[name],
                    totals: sectionTotalScores[name],
                },
            }),
            {},
        );
    };
}
