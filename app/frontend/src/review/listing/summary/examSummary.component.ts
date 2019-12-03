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
import { FileService } from '../../../utility/file/file.service';
import { ReviewListService } from '../reviewList.service';

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

        constructor(
            private Files: FileService,
            private ReviewList: ReviewListService,
            private $filter: ng.IFilterService,
            private $translate: ng.translate.ITranslateService,
        ) {
            'ngInject';
        }

        private refresh = () => {
            this.buildGradeDistribution();
            this.gradedCount = this.reviews.filter(r => r.exam.grade).length;
            this.gradeDistribution = {};
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
        };

        getAverageTime = () => {
            const durations = this.reviews.map(r => r.duration);
            return durations.reduce((a, b) => a + b, 0) / durations.length / 60000;
        };

        printQuestionScoresReport = () => {
            const ids = this.reviews.map(r => r.exam.id);
            console.log('main exam: ', this.exam.id);
            console.log('exam ids:', ids);
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
