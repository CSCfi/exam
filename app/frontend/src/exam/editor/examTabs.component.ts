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
import { StateParams, StateService } from '@uirouter/core';
import * as angular from 'angular';
import * as _ from 'lodash';
import * as toastr from 'toastr';

import { SessionService, User } from '../../session/session.service';
import { Exam } from '../exam.model';

export const ExamTabsComponent: angular.IComponentOptions = {
    template: require('./examTabs.template.html'),
    bindings: {
        collaborative: '<',
    },
    controller: class ExamTabsController implements angular.IComponentController {
        collaborative: boolean;
        user: User;
        examInfo: { title: string | null };
        exam: Exam;
        reviews: any[];
        activeTab: number;

        constructor(
            private $http: angular.IHttpService,
            private $stateParams: StateParams,
            private $translate: angular.translate.ITranslateService,
            private $window: angular.IWindowService,
            private $filter: angular.FilterFactory,
            private $state: StateService,
            private Session: SessionService,
            private ReviewList: any,
        ) {
            'ngInject';

            this.examInfo = { title: null };
        }

        $onInit = () => {
            this.user = this.Session.getUser();
            if (this.collaborative) {
                this.downloadCollaborativeExam();
            } else {
                this.downloadExam();
            }
            this.getReviews(this.$stateParams.id);
            this.activeTab = parseInt(this.$stateParams.tab);
        };

        updateTitle = (code: string | null, name: string | null) => {
            if (code && name) {
                this.examInfo.title = code + ' ' + name;
            } else if (code) {
                this.examInfo.title = code + ' ' + this.$translate.instant('sitnet_no_name');
            } else {
                this.examInfo.title = name;
            }
        };

        reload = () => (this.collaborative ? this.downloadCollaborativeExam() : this.downloadExam());

        isOwner = () => {
            return this.exam.examOwners.some(
                x => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
            );
        };

        onReviewsLoaded = (data: { reviews: unknown[] }) => (this.reviews = data.reviews);

        tabChanged = (index: number) => {
            const params = { id: this.exam.id, tab: index + 1 };
            this.$state.go(this.collaborative ? 'collaborativeExamEditor' : 'examEditor', params);
        };

        switchToBasicInfo = () => (this.activeTab = 1);

        switchToQuestions = () => (this.activeTab = 2);

        switchToPublishSettings = () => (this.activeTab = 3);

        examUpdated = (props: { code: string; name: string; scaleChange: boolean }) => {
            this.updateTitle(props.code, props.name);
            if (props.scaleChange) {
                // Propagate a change so that children (namely auto eval component) can act based on scale change
                this.exam = angular.copy(this.exam);
            }
        };

        goBack = event => {
            event.preventDefault();
            this.$window.history.back();
        };

        private downloadExam = () => {
            this.$http.get(`/app/exams/${this.$stateParams.id}`).then(
                (response: angular.IHttpResponse<Exam>) => {
                    const exam = response.data;
                    this.exam = exam;
                    this.exam.hasEnrolmentsInEffect = this.hasEffectiveEnrolments(exam);
                    this.updateTitle(!exam.course ? null : exam.course.code, exam.name);
                },
                err => toastr.error(err.data),
            );
        };

        private downloadCollaborativeExam = () => {
            this.$http.get(`/integration/iop/exams/${this.$stateParams.id}`).then(
                (response: angular.IHttpResponse<Exam>) => {
                    const exam = response.data;
                    this.exam = exam;
                    this.exam.hasEnrolmentsInEffect = this.hasEffectiveEnrolments(exam);
                    this.updateTitle(!exam.course ? null : exam.course.code, exam.name);
                },
                err => toastr.error(err.data),
            );
        };

        private getReviews = (examId: number) => {
            this.$http.get(this.getResource(examId)).then((response: angular.IHttpResponse<any[]>) => {
                const reviews = response.data;
                reviews.forEach(r => {
                    r.displayName = this.ReviewList.getDisplayName(r, this.collaborative);
                    r.duration = this.$filter('diffInMinutesTo')(r.started, r.ended);
                    if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                        r.isUnderLanguageInspection = true;
                    }
                });
                this.reviews = reviews;
            });
        };

        private getResource = (examId: number) => {
            return this.collaborative ? `/integration/iop/reviews/${examId}` : `/app/reviews/${examId}`;
        };

        private hasEffectiveEnrolments = (exam: Exam) =>
            exam.examEnrolments.some(ee => !_.isNil(ee.reservation) && ee.reservation.endAt > new Date().getTime());
    },
};

angular.module('app.exam.editor').component('examTabs', ExamTabsComponent);
