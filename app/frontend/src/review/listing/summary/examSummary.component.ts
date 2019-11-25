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

import { Exam, ExamSection, ExamSectionQuestion } from '../../../exam/exam.model';

export const ExamSummaryComponent: ng.IComponentOptions = {
    template: require('./examSummary.template.html'),
    bindings: {
        exam: '<',
        reviews: '<',
    },
    controller: class ExamSummaryController implements ng.IComponentController, ng.IOnInit, ng.IOnChanges {
        exam: Exam;
        reviews: any[];
        gradeDistribution: _.Dictionary<number>;
        gradedCount: number;
        gradeTimeData: string[];
        gradeTimeLabels: string[];
        gradeDistributionData: number[];
        gradeDistributionLabels: string[];
        chartOptions: any;

        private refresh = () => {
            this.buildGradeDistribution();
            this.gradedCount = this.reviews.filter(r => r.exam.grade).length;
            this.buildGradeTime();
            this.chartOptions = {
                elements: {
                    line: {
                        tension: 0,
                    },
                },
                scales: {
                    xAxes: [
                        {
                            scaleLabel: {
                                display: true,
                                labelString: 'min',
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
            this.reviews.filter(r => r.exam.examFeedback && r.exam.examFeedback.feedbackStatus === false).length;

        getFeedbackPercentage = () => (this.getReadFeedback() / this.getTotalFeedback()) * 100;

        getTotalQuestions = () => {
            const sections: ExamSection[] = this.reviews.map(r => r.exam.examSections);
            const questions: ExamSectionQuestion[][] = sections.map(s => s.sectionQuestions);
            return _.flatMap(questions).length;
        };

        buildGradeDistribution = () => {
            const grades: string[] = this.reviews.filter(r => r.exam.grade).map(r => r.exam.grade.name);
            this.gradeDistribution = _.countBy(grades);
            this.gradeDistributionData = Object.values(this.gradeDistribution);
            this.gradeDistributionLabels = Object.keys(this.gradeDistribution);
        };

        getAverageTime = () => {
            const durations = this.reviews.map(r => r.duration);
            return durations.reduce((a, b) => a + b, 0) / durations.length;
        };

        buildGradeTime = () => {
            const gradeTimes: any[] = this.reviews
                .sort((a, b) => (a.duration > b.duration ? 1 : -1))
                .map(r => [r.duration, r.exam.grade.name]);
            this.gradeTimeLabels = gradeTimes.map(g => g[0]);
            this.gradeTimeData = gradeTimes.map(g => g[1]);
        };
    },
};

angular.module('app.review').component('examSummary', ExamSummaryComponent);