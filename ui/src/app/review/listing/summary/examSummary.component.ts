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
import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Chart } from 'chart.js';
import { eachDayOfInterval, format, min, startOfDay } from 'date-fns';
import * as _ from 'lodash';

import { ExamService } from '../../../exam/exam.service';
import { QuestionService } from '../../../question/question.service';
import { FileService } from '../../../utility/file/file.service';
import { CommonExamService } from '../../../utility/miscellaneous/commonExam.service';
import { AbortedExamsComponent } from '../dialogs/abortedExams.component';
import { NoShowsComponent } from '../dialogs/noShows.component';
import { ReviewListService } from '../reviewList.service';

import type { Exam } from '../../../exam/exam.model';
import type { ExamEnrolment } from '../../../enrolment/enrolment.model';

import type { ExamParticipation, Question } from '../../../exam/exam.model';
import type { Review } from '../../review.model';
type QuestionData = {
    question: string;
    max: number;
    avg: number;
    median: number;
    approvalRate: number;
};

@Component({
    selector: 'exam-summary',
    templateUrl: './examSummary.component.html',
})
export class ExamSummaryComponent {
    @Input() exam!: Exam;
    @Input() reviews: ExamParticipation[] = [];
    @Input() collaborative = false;

    gradeDistribution: Record<string, number> = {};
    gradedCount = 0;
    gradeTimeData: Array<{ x: string; y: number }> = [];
    examinationDateData: { date: number; amount: number }[] = [];
    questionScoreData: QuestionData[] = [];
    gradeDistributionData: number[] = [];
    gradeDistributionLabels: string[] = [];
    abortedExams: Review[] = [];
    noShows: ExamEnrolment[] = [];
    gradeDistributionChart!: Chart;
    gradeTimeChart!: Chart;
    examinationDateDistribution!: Chart;
    questionScoreChart!: Chart;
    approvalRatingChart!: Chart;
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
    ) {}

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

    ngOnInit() {
        this.refresh();
        // Had to manually update chart locales
        this.translate.onLangChange.subscribe(() => this.updateChartLocale());
        this.calcSectionMaxAndAverages();
    }

    ngOnChanges() {
        this.refresh();
    }

    getGradeDistribution = () => this.gradeDistribution;

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

    calculateGradeDistribution = () => {
        const grades: string[] = this.reviews
            .filter((r) => r.exam.gradedTime)
            .map((r) => (r.exam.grade ? r.exam.grade.name : this.translate.instant('sitnet_no_grading')));
        this.gradeDistribution = _.countBy(grades);
        this.gradeDistributionData = Object.values(this.gradeDistribution);
        this.gradeDistributionLabels = Object.keys(this.gradeDistribution).map(this.CommonExam.getExamGradeDisplayName);
    };

    renderGradeDistributionChart = () => {
        const chartColors = ['#97BBCD', '#DCDCDC', '#F7464A', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];
        const amount = this.translate.instant('sitnet_pieces');

        this.gradeDistributionChart = new Chart('gradeDistributionChart', {
            type: 'pie',
            data: {
                datasets: [
                    {
                        data: this.gradeDistributionData,
                        backgroundColor: chartColors,
                    },
                ],
                labels: this.gradeDistributionLabels,
            },
            options: {
                animation: {
                    onComplete: (chart) => {
                        const ctx = chart.ctx;
                        ctx.font = Chart.helpers.fontString(
                            Chart.defaults.global.defaultFontFamily,
                            'bold',
                            Chart.defaults.global.defaultFontFamily,
                        );
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        const dataset = chart.data.datasets[0];
                        for (let i = 0; i < dataset.data?.length; i++) {
                            const model = dataset._meta[Object.keys(dataset._meta)[0]].data[i]._model,
                                total = dataset._meta[Object.keys(dataset._meta)[0]].total,
                                mid_radius = model.innerRadius + (model.outerRadius - model.innerRadius) / 2,
                                start_angle = model.startAngle,
                                end_angle = model.endAngle,
                                mid_angle = start_angle + (end_angle - start_angle) / 2;

                            const x = mid_radius * Math.cos(mid_angle);
                            const y = mid_radius * Math.sin(mid_angle);

                            ctx.fillStyle = '#444';
                            const percent = String(Math.round((dataset.data[i] / total) * 100)) + '%';
                            ctx.fillText(`${dataset.data[i]} ${amount}`, model.x + x, model.y + y);
                            // Display percent in another line, line break doesn't work for fillText
                            ctx.fillText(`(${percent})`, model.x + x, model.y + y + 15);
                        }
                    },
                },
                legend: { display: true },
                tooltips: { enabled: false },
                events: [],
            },
        });
    };

    calcAverage = (numArray?: number[]) => (numArray ? numArray.reduce((a, b) => a + b, 0) / numArray.length : 0);

    getDurationAsMillis = (dateStr: string) => new Date(dateStr).getTime();

    getDurationAsMinutes = (dateStr: string) => Math.round(this.getDurationAsMillis(dateStr) / 1000 / 60);

    getAverageTime = () => {
        const durations = this.reviews.map((r) => this.getDurationAsMinutes(r.duration));
        return this.calcAverage(durations);
    };

    getNoShows = () => {
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

    calculateGradeTimeValues = () => {
        this.gradeTimeData = this.reviews
            .sort((a, b) => (this.getDurationAsMillis(a.duration) > this.getDurationAsMillis(b.duration) ? 1 : -1))
            .map((r) => ({ x: String(this.getDurationAsMinutes(r.duration)), y: r.exam.totalScore }));
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

    calculateExaminationTimeValues = () => {
        const dates = eachDayOfInterval({
            start: min([new Date(this.exam.examActiveStartDate as string), new Date()]),
            end: min([new Date(this.exam.examActiveEndDate as string), new Date()]),
        });
        this.examinationDateData = dates.map((d, i) => ({
            date: i,
            amount: this.reviews.filter((r) => startOfDay(new Date(r.ended)) <= d).length,
        }));
    };

    renderQuestionScoreChart = () => {
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
                        lineTension: 0.1,
                        borderColor: 'orange',
                    },
                    {
                        label: 'avg',
                        data: this.questionScoreData.map((d) => d.avg),
                        fill: false,
                        lineTension: 0.1,
                        borderColor: 'blue',
                    },
                    {
                        label: 'median',
                        data: this.questionScoreData.map((d) => d.median),
                        fill: false,
                        lineTension: 0.1,
                        borderColor: 'red',
                    },
                ],
            },
        });
    };

    renderApprovalRateChart = () => {
        this.approvalRatingChart = new Chart('approvalRatingChart', {
            options: {
                maintainAspectRatio: false,
                scales: {
                    yAxes: [
                        {
                            ticks: {
                                beginAtZero: true,
                            },
                        },
                    ],
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
                        lineTension: 0.1,
                        borderColor: 'green',
                    },
                ],
            },
        });
    };

    renderExaminationTimeDistributionChart = () => {
        this.examinationDateDistribution = new Chart('examinationDateDistributionChart', {
            options: {
                maintainAspectRatio: false,
                scales: {
                    yAxes: [
                        {
                            ticks: {
                                beginAtZero: true,
                                callback: (label: number) => {
                                    if (Math.floor(label) === label) {
                                        return label;
                                    }
                                },
                            },
                        },
                    ],
                    xAxes: [
                        {
                            scaleLabel: {
                                display: true,
                                labelString: this.translate.instant('sitnet_days_since_period_beginning').toLowerCase(),
                            },
                        },
                    ],
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
                        lineTension: 0.1,
                        pointRadius: 0,
                    },
                ],
            },
        });
    };

    renderGradeTimeChart = () => {
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
                legend: { display: false },
                responsive: true,
                maintainAspectRatio: false,
                tooltips: {
                    displayColors: false,
                    callbacks: {
                        label: (tooltipItem) => {
                            const { xLabel, yLabel } = tooltipItem;
                            const pointsLabel = this.translate.instant('sitnet_word_points');
                            const minutesLabel = this.translate.instant('sitnet_word_minutes');
                            return `${pointsLabel}: ${yLabel} ${minutesLabel}: ${xLabel}`;
                        },
                    },
                },
                scales: {
                    yAxes: [
                        {
                            ticks: { max: examMaxScore, min: 0 },
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: this.translate.instant('sitnet_word_points').toLowerCase(),
                            },
                        },
                    ],
                    xAxes: [
                        {
                            ticks: { max: duration, min: 0 },
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: this.translate.instant('sitnet_word_minutes').toLowerCase(),
                            },
                        },
                    ],
                },
            },
        });
    };

    updateChartLocale() {
        if (this.gradeTimeChart.options?.scales) {
            const scales = this.gradeTimeChart.options.scales;
            if (scales.xAxes && scales.xAxes[0].scaleLabel) {
                scales.xAxes[0].scaleLabel.labelString = this.translate.instant('sitnet_word_points').toLowerCase();
            }
            if (scales.yAxes && scales.yAxes[0].scaleLabel) {
                scales.yAxes[0].scaleLabel.labelString = this.translate.instant('sitnet_word_minutes').toLowerCase();
            }
        }
        this.gradeTimeChart.update();
        if (this.examinationDateDistribution.options?.scales) {
            const scales = this.examinationDateDistribution.options.scales;
            if (scales.xAxes && scales.xAxes[0].scaleLabel) {
                scales.xAxes[0].scaleLabel.labelString = this.translate
                    .instant('sitnet_days_since_period_beginning')
                    .toLowerCase();
            }
        }
        if (this.examinationDateDistribution.data?.datasets) {
            this.examinationDateDistribution.data.datasets[0].label = this.translate.instant('sitnet_amount_exams');
        }
        this.examinationDateDistribution.update();
    }

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

    calcSectionMaxAndAverages = () => {
        const parentSectionMaxScores: _.Dictionary<number> = this.exam.examSections.reduce(
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
            }, {} as _.Dictionary<number>);

        const sectionMaxScores = { ...childSectionMaxScores, ...parentSectionMaxScores };

        const sectionTotalScores: _.Dictionary<number[]> = childExamSections.reduce((obj, curr) => {
            const { name } = curr;
            const max = sectionMaxScores[name] || 0;
            const score = Math.min(this.Exam.getSectionTotalScore(curr), max);
            const scores = obj[name] || [];
            return { ...obj, [name]: [...scores, score] };
        }, {} as _.Dictionary<number[]>);

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
}
