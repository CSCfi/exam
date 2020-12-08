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
import * as ng from 'angular';
import * as _ from 'lodash';
import * as Chart from 'chart.js';

import { Exam, ExamParticipation } from '../../../exam/exam.model';
import { FileService } from '../../../utility/file/file.service';
import { IModalService } from 'angular-ui-bootstrap';

export const ExamSummaryComponent: ng.IComponentOptions = {
    template: require('./examSummary.template.html'),
    bindings: {
        exam: '<',
        reviews: '<',
        collaborative: '<',
    },
    controller: class ExamSummaryController implements ng.IComponentController, ng.IOnInit, ng.IOnChanges {
        exam: Exam;
        reviews: ExamParticipation[];
        gradeDistribution: _.Dictionary<number>;
        gradedCount: number;
        gradeTimeData: Array<{ x: number; y: number }>;
        gradeDistributionData: number[];
        gradeDistributionLabels: string[];
        abortedExams: ExamParticipation[];
        noShows: unknown[];
        collaborative: boolean;
        gradeDistributionChart: any;
        gradeTimeChart: any;
        sectionScores: _.Dictionary<{ max: number; totals: number[] }>;

        constructor(
            private Files: FileService,
            private $filter: ng.IFilterService,
            private $translate: ng.translate.ITranslateService,
            private $uibModal: IModalService,
            private $http: angular.IHttpService,
            private $rootScope: angular.IRootScopeService,
            private Exam: any,
        ) {
            'ngInject';
        }

        private refresh = () => {
            this.getNoShows();
            this.calculateGradeDistribution();
            this.renderGradeDistributionChart();
            this.gradedCount = this.reviews.filter(r => r.exam.gradedTime).length;
            this.abortedExams = this.reviews.filter(r => r.exam.state === 'ABORTED');
            this.calculateGradeTimeValues();
            this.renderGradeTimeChart();
        };

        $onInit = () => {
            this.refresh();
            // Had to manually update chart locales
            this.$rootScope.$on('$localeChangeSuccess', () => {
                this.updateChartLocale();
            });
            this.calcSectionMaxAndAverages();
        };

        $onChanges = () => this.refresh();

        getGradeDistribution = () => this.gradeDistribution;

        getRegisteredCount = () => this.reviews.length;

        getReadFeedback = () =>
            this.reviews.filter(r => r.exam.examFeedback && r.exam.examFeedback.feedbackStatus === true).length;

        getTotalFeedback = () =>
            this.reviews.filter(
                r =>
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
                .filter(r => r.exam.gradedTime)
                .map(r => (r.exam.grade ? r.exam.grade.name : this.$translate.instant('sitnet_no_grading')));
            this.gradeDistribution = _.countBy(grades);
            this.gradeDistributionData = Object.values(this.gradeDistribution);
            this.gradeDistributionLabels = Object.keys(this.gradeDistribution);
        };

        renderGradeDistributionChart = () => {
            const chartColors = ['#97BBCD', '#DCDCDC', '#F7464A', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'];

            this.gradeDistributionChart = new Chart('gradeDistributionChart', {
                type: 'doughnut',
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
                    legend: { display: false },
                    responsive: true,
                    maintainAspectRatio: false,
                },
            });
        };

        calcAverage = (numArray?: number[]) => (numArray ? numArray.reduce((a, b) => a + b, 0) / numArray.length : 0);

        getAverageTime = () => {
            const durations = this.reviews.map(r => r.duration);
            return this.calcAverage(durations);
        };

        getNoShows = () => {
            // No-shows
            if (this.collaborative) {
                //TODO: Fetch collaborative no-shows from xm.
                this.noShows = [];
            } else {
                this.$http
                    .get(`/app/noshows/${this.exam.id}`)
                    .then((resp: angular.IHttpResponse<unknown[]>) => {
                        this.noShows = resp.data;
                    })
                    .catch(angular.noop);
            }
        };

        calculateGradeTimeValues = () => {
            this.gradeTimeData = this.reviews
                .sort((a, b) => (a.duration > b.duration ? 1 : -1))
                .map(r => ({ x: r.duration, y: r.exam.totalScore }));
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
                            label: tooltipItem => {
                                const { xLabel, yLabel } = tooltipItem;
                                const pointsLabel = this.$translate.instant('sitnet_word_points');
                                const minutesLabel = this.$translate.instant('sitnet_word_minutes');
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
                                    labelString: this.$translate.instant('sitnet_word_points').toLowerCase(),
                                },
                            },
                        ],
                        xAxes: [
                            {
                                ticks: { max: duration, min: 0 },
                                display: true,
                                scaleLabel: {
                                    display: true,
                                    labelString: this.$translate.instant('sitnet_word_minutes').toLowerCase(),
                                },
                            },
                        ],
                    },
                },
            });
        };

        updateChartLocale() {
            this.gradeTimeChart.options.scales.yAxes[0].scaleLabel.labelString = this.$translate
                .instant('sitnet_word_points')
                .toLowerCase();
            this.gradeTimeChart.options.scales.xAxes[0].scaleLabel.labelString = this.$translate
                .instant('sitnet_word_minutes')
                .toLowerCase();
            this.gradeTimeChart.update();
        }

        printQuestionScoresReport = () => {
            const ids = this.reviews.map(r => r.exam.id);
            if (ids.length > 0) {
                const url = '/app/reports/questionreport/' + this.exam.id;
                this.Files.download(
                    url,
                    this.$translate.instant('sitnet_grading_info') +
                        '_' +
                        this.$filter('date')(Date.now(), 'dd-MM-yyyy') +
                        '.xlsx',
                    { childIds: ids },
                    true,
                );
            }
        };

        openAborted = () =>
            this.$uibModal.open({
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
                component: 'abortedExams',
                resolve: {
                    exam: this.exam,
                    abortedExams: () => this.abortedExams,
                },
            });

        openNoShows = () =>
            this.$uibModal.open({
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
                component: 'noShows',
                resolve: {
                    noShows: () => this.noShows,
                },
            });

        calcSectionMaxAndAverages = () => {
            const sectionMaxScores: _.Dictionary<number> = this.exam.examSections.reduce(
                (obj, current) => ({
                    ...obj,
                    [current.name]: this.Exam.getSectionMaxScore(current),
                }),
                {},
            );
            const parentSectionNames = Object.keys(sectionMaxScores);
            const childExamSections = this.reviews
                .flatMap(r => r.exam.examSections)
                .filter(es => parentSectionNames.includes(es.name));
            const sectionTotalScores: _.Dictionary<number[]> = childExamSections.reduce((obj, curr) => {
                const { name } = curr;
                const max = sectionMaxScores[name] || 0;
                const score = Math.min(this.Exam.getSectionTotalScore(curr), max);
                const scores = obj[name] || [];
                return { ...obj, [name]: [...scores, score] };
            }, {});

            this.sectionScores = parentSectionNames.reduce(
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
    },
};

angular.module('app.review').component('examSummary', ExamSummaryComponent);
