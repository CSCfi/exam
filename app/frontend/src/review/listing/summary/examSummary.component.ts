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
import * as toast from 'toastr';

import { Exam, ExamSection, ExamSectionQuestion } from '../../../exam/exam.model';

export const ExamSummaryComponent: ng.IComponentOptions = {
    template: require('./examSummary.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<',
        onUpdate: '&',
        onNextTabSelected: '&'
    },
    controller: class ExamSummaryController implements ng.IComponentController {

        exam: Exam;
        participations: any[];
        onNextTabSelected: () => any;
        gradeDistribution: _.Dictionary<number>;
        gradedCount: number;

        constructor(
            private $http: angular.IHttpService
        ) {
            'ngInject';
        }

        $onInit = () => {
            const url = this.getResource(this.exam.id);
            this.$http.get(url).then((resp: angular.IHttpResponse<any>) => {
                this.participations = resp.data;
                this.exam = this.participations[0].exam.parent;
                this.buildGradeDistribution();
                this.gradedCount = this.participations.filter(
                    p => p.exam.grade).length;
            }).catch(err => toast.error(err.data));

            this.gradeDistribution = {};
        }

        getResource = path => `/app/reviews/${path}`;

        getGradeDistribution = () => {
            return this.gradeDistribution;
        }

        getRegisteredCount = () => this.participations.length;

        getReadFeedback = () =>
            this.participations.filter(p =>
                p.exam.examFeedback &&
                p.exam.examFeedback.feedbackStatus === true).length;

        getTotalFeedback = () =>
            this.getReadFeedback() + this.participations.filter(p =>
                p.exam.examFeedback &&
                p.exam.examFeedback.feedbackStatus === false).length;

        getFeedbackPercentage = () =>
            this.getReadFeedback() / this.getTotalFeedback() * 100;

        nextTab = () => this.onNextTabSelected();

        getTotalQuestions = () => {
            const sections: ExamSection[] = this.participations.map(p => p.exam.examSections);
            const questions: ExamSectionQuestion[][] = sections.map(s => s.sectionQuestions);
            return _.flatMap(questions).length;
        }

        buildGradeDistribution = () => {
            const grades: string[] = this.participations.filter(p => p.exam.grade).map(p => p.exam.grade.name);
            this.gradeDistribution = _.countBy(grades);
        }

        getAverageTime = () => {
            const durations = this.participations.map(p => p.duration);
            return durations.reduce((a,b) => a + b, 0) / durations.length / 60000;
        }

    }
};

angular.module('app.review').component('examSummary', ExamSummaryComponent);

