// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
    ArcElement,
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PieController,
    PointElement,
    ScatterController,
    Tooltip,
    TooltipItem,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { eachDayOfInterval, min, startOfDay } from 'date-fns';
import { countBy } from 'ramda';
import { of } from 'rxjs';
import { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { Question } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { groupBy } from 'src/app/shared/miscellaneous/helpers';

@Injectable({ providedIn: 'root' })
export class ExamSummaryService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private Question: QuestionService,
        private Exam: ExamService,
        private CommonExam: CommonExamService,
        private ReviewList: ReviewListService,
    ) {
        Chart.register([
            ArcElement,
            PointElement,
            LineElement,
            CategoryScale,
            LinearScale,
            LineController,
            PieController,
            ScatterController,
            Legend,
            Tooltip,
        ]);
    }

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

    getGradeDistributionChart = (context: string, reviews: ExamParticipation[]) => {
        const chartColors = ['#97BBCD', '#DCDCDC', '#F7464A', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
        const amount = this.translate.instant('i18n_pieces');
        const { data, labels } = this.calculateGradeDistribution(reviews);

        return new Chart(context, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: chartColors,
                    },
                ],
            },
            plugins: [ChartDataLabels],
            options: {
                maintainAspectRatio: false,
                plugins: {
                    title: { display: false },
                    tooltip: { enabled: false },
                    legend: { display: true, position: 'top' },
                    datalabels: {
                        color: 'white',
                        font: { weight: 'bold' },
                        formatter: (value, context) => {
                            const points = context.chart.data.datasets[0].data as number[];
                            const sum = points.reduce((a, b) => a + b, 0);
                            return `${value} ${amount} ${((value / sum) * 100).toFixed(2)}%`;
                        },
                    },
                },
            },
        });
    };

    getQuestionScoreChart = (context: string, reviews: ExamParticipation[]) => {
        const data = this.calculateQuestionData(reviews);
        return new Chart(context, {
            options: {
                maintainAspectRatio: false,
            },
            type: 'line',
            data: {
                labels: data.map((d) => d.question),
                datasets: [
                    {
                        label: 'max',
                        data: data.map((d) => d.max),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'orange',
                    },
                    {
                        label: 'avg',
                        data: data.map((d) => d.avg),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'blue',
                    },
                    {
                        label: 'median',
                        data: data.map((d) => d.median),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'red',
                    },
                ],
            },
        });
    };

    getApprovalRateChart = (context: string, reviews: ExamParticipation[]) => {
        const data = this.calculateQuestionData(reviews);
        return new Chart(context, {
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            },
            type: 'line',
            data: {
                labels: data.map((d) => d.question),
                datasets: [
                    {
                        label: 'max',
                        data: data.map((d) => d.approvalRate),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'green',
                    },
                ],
            },
        });
    };

    getExaminationTimeDistributionChart = (context: string, reviews: ExamParticipation[], exam: Exam) => {
        const data = this.calculateExaminationTimeValues(reviews, exam);
        return new Chart(context, {
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                if (Math.floor(Number(value)) === Number(value)) {
                                    return value;
                                }
                                return 0;
                            },
                        },
                    },
                    x: {
                        title: {
                            display: true,
                            text: this.translate.instant('i18n_days_since_period_beginning').toLowerCase(),
                        },
                    },
                },
            },
            type: 'line',
            data: {
                labels: data.map((d) => d.date),
                datasets: [
                    {
                        label: this.translate.instant('i18n_amount_exams'),
                        data: data.map((d) => d.amount),
                        fill: false,
                        borderColor: '#028a0f',
                        tension: 0.1,
                        pointRadius: 0,
                    },
                ],
            },
        });
    };

    getGradeTimeChart = (context: string, reviews: ExamParticipation[], exam: Exam) => {
        return new Chart(context, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        showLine: false,
                        pointBackgroundColor: '#F7464A',
                        data: this.calculateGradeTimeValues(reviews),
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        max: this.Exam.getMaxScore(exam),
                        min: 0,

                        display: true,
                        title: {
                            display: true,
                            text: this.translate.instant('i18n_word_points').toLowerCase(),
                        },
                    },

                    x: {
                        max: exam.duration,
                        min: 0,
                        display: true,
                        title: {
                            display: true,
                            text: this.translate.instant('i18n_word_minutes').toLowerCase(),
                        },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            label: (item: TooltipItem<'scatter'>) => {
                                const [xLabel, yLabel] = [item.label, item.formattedValue];
                                const pointsLabel = this.translate.instant('i18n_word_points');
                                const minutesLabel = this.translate.instant('i18n_word_minutes');
                                return `${pointsLabel}: ${yLabel} ${minutesLabel}: ${xLabel}`;
                            },
                        },
                    },
                },
            },
        });
    };

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

    private calculateGradeDistribution = (reviews: ExamParticipation[]) => {
        const grades = this.getGrades(reviews);
        const gradeDistribution = countBy((g) => g, grades);
        const data = Object.values(gradeDistribution);
        const labels = Object.keys(gradeDistribution).map(this.CommonExam.getExamGradeDisplayName);
        return { data: data, labels: labels };
    };

    private calculateGradeTimeValues = (reviews: ExamParticipation[]) => {
        return reviews
            .sort(
                (a, b) =>
                    this.ReviewList.diffInMinutes(a.started, a.ended) -
                    this.ReviewList.diffInMinutes(b.started, b.ended),
            )
            .map((r) => ({ x: this.ReviewList.diffInMinutes(r.started, r.ended), y: r.exam.totalScore }));
    };

    private calculateExaminationTimeValues = (reviews: ExamParticipation[], exam: Exam) => {
        const dates = eachDayOfInterval({
            start: min([new Date(exam.periodStart as string), new Date()]),
            end: min([new Date(exam.periodEnd as string), new Date()]),
        });
        return dates.map((d, i) => ({
            date: i,
            amount: reviews.filter((r) => startOfDay(new Date(r.ended)) <= d).length,
        }));
    };

    private median = (...xs: number[]) => {
        const sz = xs.length;
        const sorted = xs.sort();
        return sz % 2 == 1 ? sorted[Math.floor(sz / 2)] : (sorted[Math.floor(sz / 2 - 1)] + sorted[sz / 2]) / 2;
    };

    private calculateQuestionData = (reviews: ExamParticipation[]) => {
        const sectionQuestions = reviews
            .map((r) => r.exam)
            .flatMap((e) => e.examSections)
            .flatMap((es) => es.sectionQuestions);
        const mapped = groupBy(sectionQuestions, (sq) => (sq.question.parent as Question).id.toString());
        return Object.entries(mapped)
            .map((e) => ({
                question: e[0],
                max: this.Question.calculateMaxScore(e[1][0]), // hope this is ok
                scores: e[1].map((sq) => this.Question.calculateAnswerScore(sq)).filter((s) => s != null),
            }))
            .map((e) => ({
                question: e.question,
                max: e.max,
                avg:
                    e.scores.reduce((a, b) => {
                        const score = a + (b ? b.score : 0);
                        return score;
                    }, 0) / e.scores.length,
                median: this.median(...e.scores.map((s) => (s ? s.score : 0))),
                approvalRate: e.scores.filter((s) => s?.approved || (s && s.score > 0)).length / e.scores.length,
            }));
    };
}
