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

import { Exam, ExamParticipation } from '../../../exam/exam.model';
import { FileService } from '../../../utility/file/file.service';

export const ExamSummaryComponent: ng.IComponentOptions = {
    template: require('./examSummary.template.html'),
    bindings: {
        exam: '<',
        reviews: '<',
    },
    controller: class ExamSummaryController implements ng.IComponentController, ng.IOnInit, ng.IOnChanges {
        exam: Exam;
        reviews: ExamParticipation[];
        gradeDistribution: _.Dictionary<number>;
        gradedCount: number;
        gradeTimeData: number[][];
        gradeTimeLabels: number[];
        gradeDistributionData: number[];
        gradeDistributionLabels: string[];
        chartOptions: any;
        chartSeries: any;

        constructor(
            private Files: FileService,
            private $filter: ng.IFilterService,
            private $translate: ng.translate.ITranslateService,
        ) {
            'ngInject';
        }

        private refresh = () => {
            this.buildGradeDistribution();
            this.gradedCount = this.reviews.filter(r => r.exam.gradedTime).length;
            this.buildGradeTime();
            this.chartSeries = [this.$translate.instant('sitnet_word_points')];
            this.chartOptions = {
                scales: {
                    xAxes: [
                        {
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: this.$translate.instant('sitnet_minutes'),
                            },
                        },
                    ],
                    yAxes: [
                        {
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: this.$translate.instant('sitnet_word_points').toLowerCase(),
                            },
                        },
                    ],
                },
            };
        };

        $onInit = () => this.refresh();

        $onChanges = () => this.refresh();

        getGradeDistribution = () => this.gradeDistribution;

        getRegisteredCount = () => this.reviews.length;

        getReadFeedback = () =>
            this.reviews.filter(r => r.exam.examFeedback && r.exam.examFeedback.feedbackStatus === true).length;

        getTotalFeedback = () =>
            this.getReadFeedback() +
            this.reviews.filter(
                r =>
                    r.exam.examFeedback &&
                    (r.exam.state === 'GRADED_LOGGED' || r.exam.state === 'ARCHIVED' || r.exam.state === 'REJECTED') &&
                    r.exam.examFeedback.feedbackStatus === false,
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

        buildGradeDistribution = () => {
            const grades: string[] = this.reviews
                .filter(r => r.exam.gradedTime)
                .map(r => (r.exam.grade ? r.exam.grade.name : this.$translate.instant('sitnet_no_grading')));
            this.gradeDistribution = _.countBy(grades);
            this.gradeDistributionData = Object.values(this.gradeDistribution);
            this.gradeDistributionLabels = Object.keys(this.gradeDistribution);
        };

        getAverageTime = () => {
            const durations = this.reviews.map(r => r.duration);
            return durations.reduce((sum, b) => sum + b, 0) / durations.length;
        };

        buildGradeTime = () => {
            const gradeTimes: { duration: number; score: number }[] = this.reviews
                .sort((a, b) => (a.duration > b.duration ? 1 : -1))
                .map(r => ({ duration: r.duration, score: r.exam.totalScore }));
            this.gradeTimeLabels = gradeTimes.map(g => g.duration);
            this.gradeTimeData = [gradeTimes.map(g => g.score)];
        };

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
    },
};

angular.module('app.review').component('examSummary', ExamSummaryComponent);
