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
import { IModalService } from 'angular-ui-bootstrap';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { Exam } from '../../../exam/exam.model';

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
        collaborative: boolean;
        anonymousReviewEnabled: boolean;
        onUpdate: (_: { props: { code: string | null; name: string | null; scaleChange: boolean } }) => any;
        onNextTabSelected: () => any;
        gradeClasses: any[];
        gradeDistribution: any[];
        reviewedExam: any;

        constructor(
            private $scope: ng.IScope,
            private $translate: ng.translate.ITranslateService,
            private $uibModal: IModalService,
            private Exam: any,
            private SettingsResource: any,
            private Session: SessionService,
            private $http: angular.IHttpService
        ) {
            'ngInject';

            this.$scope.$on('$localeChangeSuccess', () => {
            });

        }

        $onInit = () => {
            const url = this.getResource(this.exam.id);
            this.$http.get(url).then(
                function (resp) {
                    const examData = resp.data;
                    const exam = examData[0].exam;
                    //this.exam = exam;
                }).catch(function (error) {
                toast.error(error.data);
            });

            this.gradeDistribution = [];
            this.gradeClasses = [];
            this.buildGradeDistribution();

        }

        getResource = function (path) {
            return `/app/reviews/${path}`;
        }

        getGradeDistribution = () => {
            return this.gradeDistribution;
        }

        getGradedCount = () => {
            /*return this.exam.children.filter(function (child) {
                return child.state === 'GRADED_LOGGED';
            }).length;*/

            return this.exam.children.length
        }

        getRegisteredCount = () => {
            return this.exam.children.length;
        }

        getReadFeedback = () => {
           /*return this.exam.children.filter(function (child) {
                return child.examFeedback.feedbackStatus === true;
           }).length;*/
           return this.exam.children.length;
        }

        getTotalFeedback = () => {
            /*return this.getReadFeedback() + this.exam.children.filter(function (child) {
                return child.examFeedback.feedbackStatus === false;
            }).length;*/
            return this.exam.children.length;
        }

        getFeedbackPercentage = () => {
            return this.getReadFeedback() / this.getTotalFeedback() * 100;
        }

        nextTab = () => this.onNextTabSelected();


        getTotalQuestions = () => {
            return this.exam.examSections.length;
        }


        buildGradeDistribution = () => {

            /*this.gradeClasses[0] = this.exam.children.filter(function (child) {
                return child.grade.name === '0';
            }).length;

            this.gradeClasses[1] = this.exam.children.filter(function (child) {
                return child.grade.name === '1';
            }).length;
            this.gradeClasses[2] = this.exam.children.filter(function (child) {
                return child.grade.name === '2';
            }).length;
            this.gradeClasses[3] = this.exam.children.filter(function (child) {
                return child.grade.name === '3';
            }).length;
            this.gradeClasses[4] = this.exam.children.filter(function (child) {
                return child.grade.name === '4';
            }).length;
            this.gradeClasses[5] = this.exam.children.filter(function (child) {
                return child.grade.name === '5';
            }).length;*/

            this.gradeClasses[0] = '0';
            this.gradeClasses[1] = '0';
            this.gradeClasses[2] = '0';
            this.gradeClasses[3] = '0';
            this.gradeClasses[4] = '0';
            this.gradeClasses[5] = '1';

            this.gradeDistribution.push({'5': this.gradeClasses[5]})
            this.gradeDistribution.push({'4': this.gradeClasses[4]})
            this.gradeDistribution.push({'3': this.gradeClasses[3]})
            this.gradeDistribution.push({'2': this.gradeClasses[2]})
            this.gradeDistribution.push({'1': this.gradeClasses[1]})
            this.gradeDistribution.push({'0': this.gradeClasses[0]})

        }

    }
};

angular.module('app.review').component('examSummary', ExamSummaryComponent);

