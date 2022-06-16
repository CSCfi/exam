/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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
    TooltipItem,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { eachDayOfInterval, format, min, startOfDay } from 'date-fns';
import { countBy } from 'lodash';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';
import type { Exam, ExamParticipation, Question } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { QuestionService } from '../../../question/question.service';
import { FileService } from '../../../shared/file/file.service';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import type { Review } from '../../review.model';
import { AbortedExamsComponent } from '../dialogs/aborted.component';
import { NoShowsComponent } from '../dialogs/no-shows.component';
import { ReviewListService } from '../review-list.service';

type QuestionData = {
    question: string;
    max: number;
    avg: number;
    median: number;
    approvalRate: number;
};

@Component({
    selector: 'xm-exam-summary',
    templateUrl: './exam-summary.component.html',
})
export class ExamSummaryComponent implements OnInit, OnChanges {
    @Input() exam!: Exam;
    @Input() reviews: ExamParticipation[] = [];
    @Input() collaborative = false;

    gradeDistribution: Record<string, number> = {};
    gradedCount = 0;
    gradeTimeData: { x: number; y: number }[] = [];
    examinationDateData: { date: number; amount: number }[] = [];
    questionScoreData: QuestionData[] = [];
    gradeDistributionData: number[] = [];
    gradeDistributionLabels: string[] = [];
    abortedExams: Review[] = [];
    noShows: ExamEnrolment[] = [];
    gradeDistributionChart!: Chart;
    gradeTimeChart!: Chart<'scatter'>;
    examinationDateDistribution!: Chart<'line'>;
    questionScoreChart!: Chart<'line'>;
    approvalRatingChart!: Chart<'line'>;
    sectionScores: Record<string, { max: number; totals: number[] }> = {};

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private modal: NgbModal,
        private Exam: ExamService,
        private CommonExam: CommonExamService,
        private Question: QuestionService,
        private ReviewList: ReviewListService,
        private Files: FileService,
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
        ]);
    }

    ngOnInit() {
        this.refresh();
        // Had to manually update chart locales
        this.translate.onLangChange.subscribe(() => this.updateChartLocale());
        this.calcSectionMaxAndAverages();
    }

    ngOnChanges() {
        this.refresh();
    }

    getRegisteredCount = () => this.reviews.length;

    getReadFeedback = () =>
        this.reviews.filter((r) => r.exam.examFeedback && r.exam.examFeedback.feedbackStatus === true).length;

    getTotalFeedback = () =>
        this.reviews.filter(
            (r) =>
                r.exam.examFeedback &&
                (r.exam.state === 'GRADED_LOGGED' || r.exam.state === 'ARCHIVED' || r.exam.state === 'REJECTED'),
        ).length;

    getFeedbackPercentage = () => (this.getReadFeedback() / this.getTotalFeedback()) * 100;

    getQuestionCounts = () => {
        const effectiveCount = this.exam.examSections.reduce(
            (sum, es) => sum + (es.lotteryOn ? es.lotteryItemCount : es.sectionQuestions.length),
            0,
        );
        const totalCount = this.exam.examSections.reduce((sum, es) => sum + es.sectionQuestions.length, 0);
        return `${effectiveCount} (${totalCount})`;
    };

    calcAverage = (ns: number[]) => (ns || []).reduce((a, b) => a + b, 0) / ns.length || 1;

    getAverageTime = () => {
        const durations = this.reviews.map((r) => this.diffInMinutes(r.started, r.ended));
        return (durations.reduce((a, b) => a + b, 0) / durations.length || 1).toFixed(2);
    };

    printQuestionScoresReport = () => {
        const ids = this.reviews.map((r) => r.exam.id);
        if (ids.length > 0) {
            const url = '/app/reports/questionreport/' + this.exam.id;
            this.Files.download(
                url,
                this.translate.instant('sitnet_grading_info') + '_' + format(new Date(), 'dd-MM-yyyy') + '.xlsx',
                { childIds: ids.map((i) => i.toString()) },
                true,
            );
        }
    };

    openAborted = () => {
        const modalRef = this.modal.open(AbortedExamsComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modalRef.componentInstance.exam = this.exam;
        modalRef.componentInstance.abortedExams = this.abortedExams;
    };

    openNoShows = () => {
        const modalRef = this.modal.open(NoShowsComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modalRef.componentInstance.noShows = this.noShows;
    };

    private getNoShows = () => {
        // No-shows
        if (this.collaborative) {
            //TODO: Fetch collaborative no-shows from xm.
            this.noShows = [];
        } else {
            this.http
                .get<ExamEnrolment[]>(`/app/noshows/${this.exam.id}`)
                .subscribe((enrolments) => (this.noShows = enrolments));
        }
    };

    private calculateGradeDistribution = () => {
        const grades: string[] = this.reviews
            .filter((r) => r.exam.gradedTime)
            .map((r) => (r.exam.grade ? r.exam.grade.name : this.translate.instant('sitnet_no_grading')));
        this.gradeDistribution = countBy(grades);
        this.gradeDistributionData = Object.values(this.gradeDistribution);
        this.gradeDistributionLabels = Object.keys(this.gradeDistribution).map(this.CommonExam.getExamGradeDisplayName);
    };

    private renderGradeDistributionChart = () => {
        const chartColors = ['#97BBCD', '#DCDCDC', '#F7464A', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
        const amount = this.translate.instant('sitnet_pieces');

        this.gradeDistributionChart = new Chart('gradeDistributionChart', {
            type: 'pie',
            data: {
                labels: this.gradeDistributionLabels,
                datasets: [
                    {
                        data: this.gradeDistributionData,
                        backgroundColor: chartColors,
                    },
                ],
            },
            plugins: [ChartDataLabels],
            options: {
                plugins: {
                    title: { display: false },
                    tooltip: { enabled: true },
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

    private calculateGradeTimeValues = () => {
        this.gradeTimeData = this.reviews
            .sort((a, b) => (this.diffInMinutes(a.started, a.ended) > this.diffInMinutes(b.started, b.ended) ? 1 : -1))
            .map((r) => ({ x: this.diffInMinutes(r.started, r.ended), y: r.exam.totalScore }));
    };

    private calculateExaminationTimeValues = () => {
        const dates = eachDayOfInterval({
            start: min([new Date(this.exam.examActiveStartDate as string), new Date()]),
            end: min([new Date(this.exam.examActiveEndDate as string), new Date()]),
        });
        this.examinationDateData = dates.map((d, i) => ({
            date: i,
            amount: this.reviews.filter((r) => startOfDay(new Date(r.ended)) <= d).length,
        }));
    };

    private renderQuestionScoreChart = () => {
        this.questionScoreChart = new Chart('questionScoreChart', {
            options: {
                maintainAspectRatio: false,
            },
            type: 'line',
            data: {
                labels: this.questionScoreData.map((d) => d.question),
                datasets: [
                    {
                        label: 'max',
                        data: this.questionScoreData.map((d) => d.max),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'orange',
                    },
                    {
                        label: 'avg',
                        data: this.questionScoreData.map((d) => d.avg),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'blue',
                    },
                    {
                        label: 'median',
                        data: this.questionScoreData.map((d) => d.median),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'red',
                    },
                ],
            },
        });
    };

    private renderApprovalRateChart = () => {
        this.approvalRatingChart = new Chart('approvalRatingChart', {
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
                labels: this.questionScoreData.map((d) => d.question),
                datasets: [
                    {
                        label: 'max',
                        data: this.questionScoreData.map((d) => d.approvalRate),
                        fill: false,
                        tension: 0.1,
                        borderColor: 'green',
                    },
                ],
            },
        });
    };

    private renderExaminationTimeDistributionChart = () => {
        this.examinationDateDistribution = new Chart('examinationDateDistributionChart', {
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
                            text: this.translate.instant('sitnet_days_since_period_beginning').toLowerCase(),
                        },
                    },
                },
            },
            type: 'line',
            data: {
                labels: this.examinationDateData.map((d) => d.date),
                datasets: [
                    {
                        label: this.translate.instant('sitnet_amount_exams'),
                        data: this.examinationDateData.map((d) => d.amount),
                        fill: false,
                        borderColor: '#028a0f',
                        tension: 0.1,
                        pointRadius: 0,
                    },
                ],
            },
        });
    };

    private renderGradeTimeChart = () => {
        const { duration } = this.exam;
        const examMaxScore = this.Exam.getMaxScore(this.exam);

        // This could be done as a separate chart component after Angular migration
        this.gradeTimeChart = new Chart('gradeTimeChart', {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        showLine: false,
                        pointBackgroundColor: '#F7464A',
                        data: this.gradeTimeData,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        max: examMaxScore,
                        min: 0,

                        display: true,
                        title: {
                            display: true,
                            text: this.translate.instant('sitnet_word_points').toLowerCase(),
                        },
                    },

                    x: {
                        max: duration,
                        min: 0,
                        display: true,
                        title: {
                            display: true,
                            text: this.translate.instant('sitnet_word_minutes').toLowerCase(),
                        },
                    },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            label: (item: TooltipItem<any>) => {
                                const [xLabel, yLabel] = [item.dataset.label, item.dataset.label];
                                const pointsLabel = this.translate.instant('sitnet_word_points');
                                const minutesLabel = this.translate.instant('sitnet_word_minutes');
                                return `${pointsLabel}: ${yLabel} ${minutesLabel}: ${xLabel}`;
                            },
                        },
                    },
                },
            },
        });
    };

    private updateChartLocale() {
        if (this.gradeTimeChart.options?.scales) {
            const scales = this.gradeTimeChart.options.scales;
            if (scales.x?.title) {
                scales.x.title.text = this.translate.instant('sitnet_word_points').toLowerCase();
            }
            if (scales.y?.title) {
                scales.y.title.text = this.translate.instant('sitnet_word_minutes').toLowerCase();
            }
        }
        this.gradeTimeChart.update();
        if (this.examinationDateDistribution.options?.scales) {
            const scales = this.examinationDateDistribution.options.scales;
            if (scales.x?.title) {
                scales.x.title.text = this.translate.instant('sitnet_days_since_period_beginning').toLowerCase();
            }
        }
        if (this.examinationDateDistribution.data?.datasets) {
            this.examinationDateDistribution.data.datasets[0].label = this.translate.instant('sitnet_amount_exams');
        }
        this.examinationDateDistribution.update();
    }

    private calcSectionMaxAndAverages = () => {
        const parentSectionMaxScores: Record<string, number> = this.exam.examSections.reduce(
            (obj, current) => ({
                ...obj,
                [current.name]: this.Exam.getSectionMaxScore(current),
            }),
            {},
        );
        const childExamSections = this.reviews.flatMap((r) => r.exam.examSections);

        /* Get section max scores from child exams as well, in case sections got renamed/deleted from parent */
        const childSectionMaxScores = this.reviews
            .flatMap((r) => r.exam.examSections)
            .filter((es) => !parentSectionMaxScores[es.name])
            .reduce((obj, current) => {
                const prevMax = obj[current.name] || 0;
                const newMax = this.Exam.getSectionMaxScore(current);
                return { ...obj, [current.name]: Math.max(prevMax, newMax) };
            }, {} as Record<string, number>);

        const sectionMaxScores = { ...childSectionMaxScores, ...parentSectionMaxScores };

        const sectionTotalScores: Record<string, number[]> = childExamSections.reduce((obj, curr) => {
            const { name } = curr;
            const max = sectionMaxScores[name] || 0;
            const score = Math.min(this.Exam.getSectionTotalScore(curr), max);
            const scores = obj[name] || [];
            return { ...obj, [name]: [...scores, score] };
        }, {} as Record<string, number[]>);

        this.sectionScores = Object.keys(sectionMaxScores).reduce(
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

    private diffInMinutes = (from: string, to: string) => {
        const diff = (new Date(to).getTime() - new Date(from).getTime()) / 1000 / 60;
        return Math.round(diff);
    };

    private refresh = () => {
        this.getNoShows();
        this.calculateGradeDistribution();
        this.renderGradeDistributionChart();
        this.calculateExaminationTimeValues();
        this.renderExaminationTimeDistributionChart();
        this.gradedCount = this.reviews.filter((r) => r.exam.gradedTime).length;
        this.abortedExams = this.ReviewList.filterByStateAndEnhance(['ABORTED'], this.reviews, this.collaborative);
        this.calculateGradeTimeValues();
        this.renderGradeTimeChart();
        this.calculateQuestionData();
        this.renderQuestionScoreChart();
        this.renderApprovalRateChart();
    };

    private median = (...xs: number[]) => {
        const sz = xs.length;
        const sorted = xs.sort();
        return sz % 2 == 1 ? sorted[Math.floor(sz / 2)] : (sorted[Math.floor(sz / 2 - 1)] + sorted[sz / 2]) / 2;
    };

    private groupBy = <T>(xs: T[], fn: (x: T) => string) =>
        xs.map(fn).reduce((acc, x, i) => {
            acc[x] = (acc[x] || []).concat(xs[i]);
            return acc;
        }, {} as { [k: string]: T[] });

    private calculateQuestionData = () => {
        const sectionQuestions = this.reviews
            .map((r) => r.exam)
            .flatMap((e) => e.examSections)
            .flatMap((es) => es.sectionQuestions);
        const mapped = this.groupBy(sectionQuestions, (sq) => (sq.question.parent as Question).id.toString());
        this.questionScoreData = Object.entries(mapped)
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
