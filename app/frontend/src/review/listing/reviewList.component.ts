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
import * as angular from 'angular';
import { IModalService } from 'angular-ui-bootstrap';

import { Exam, ExamParticipation } from '../../exam/exam.model';
import { FileService } from '../../utility/file/file.service';

export const ReviewListComponent: angular.IComponentOptions = {
    template: require('./reviewList.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<',
        reviews: '<'
    },
    controller: class ReviewListController implements angular.IComponentController,
        angular.IOnInit, angular.IOnChanges {

        private exam: Exam;
        private collaborative: boolean;
        private reviews: ExamParticipation[];

        private noShows: unknown[];
        private abortedExams: ExamParticipation[];
        private inProgressReviews: ExamParticipation[];
        private gradedReviews: ExamParticipation[];
        private gradedLoggedReviews: ExamParticipation[];
        private archivedReviews: ExamParticipation[];
        private languageInspectedReviews: ExamParticipation[];
        private rejectedReviews: ExamParticipation[];

        constructor(
            private $uibModal: IModalService,
            private $http: angular.IHttpService,
            private Files: FileService
        ) {
            'ngInject';
        }

        $onInit() {
            // No-shows
            if (this.collaborative) {
                //TODO: Fetch collaborative no-shows from xm.
                this.noShows = [];
            } else {
                this.$http.get(`/app/noshows/${this.exam.id}`).then((resp: angular.IHttpResponse<unknown[]>) => {
                    this.noShows = resp.data;
                }).catch(angular.noop);
            }
        }

        $onChanges = function () {
            this.abortedExams = this.filterByState(['ABORTED']);
            this.inProgressReviews = this.filterByState(['REVIEW', 'REVIEW_STARTED']);
            this.gradedReviews = this.reviews.filter(
                r => r.exam.state === 'GRADED' &&
                    (!r.exam.languageInspection || r.exam.languageInspection.finishedAt)
            );
            this.gradedLoggedReviews = this.filterByState(['GRADED_LOGGED']);
            this.archivedReviews = this.filterByState(['ARCHIVED']);
            this.languageInspectedReviews = this.reviews.filter(
                r => r.exam.state === 'GRADED' && r.exam.languageInspection &&
                    !r.exam.languageInspection.finishedAt
            );
            this.rejectedReviews = this.filterByState(['REJECTED']);
        };

        filterByState = (states: string[]) => this.reviews.filter(r => states.indexOf(r.exam.state) > -1);

        onArchive = (reviews: ExamParticipation[]) => {
            const ids = reviews.map(r => r.id);
            const archived = this.gradedLoggedReviews.filter(glr => ids.indexOf(glr.id) > -1);
            this.archivedReviews = this.archivedReviews.concat(archived);
            this.gradedLoggedReviews = this.gradedLoggedReviews.filter(glr => ids.indexOf(glr.id) === -1);
        };

        onRegistration = (reviews: (ExamParticipation & { selected: boolean; displayedGradingTime: string })[]) => {
            reviews.forEach(r => {
                const index = this.gradedReviews.map(gr => gr.id).indexOf(r.id);
                this.gradedReviews.splice(index, 1);
                r.selected = false;
                r.displayedGradingTime = r.exam.languageInspection ?
                    r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                this.gradedLoggedReviews.push(r);
            });
            this.gradedReviews = angular.copy(this.gradedReviews);
            this.gradedLoggedReviews = angular.copy(this.gradedLoggedReviews);
        };

        getAnswerAttachments = () =>
            this.$uibModal.open({
                backdrop: 'static',
                keyboard: true,
                animation: true,
                component: 'archiveDownload'
            }).result.then(
                params => this.Files.download(
                    `/app/exam/${this.exam.id}/attachments`, `${this.exam.id}.tar.gz`, params)
            ).catch(angular.noop);


        openAborted = () =>
            this.$uibModal.open({
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
                component: 'abortedExams',
                resolve: {
                    exam: this.exam,
                    abortedExams: () => this.abortedExams
                }
            });

        openNoShows = () =>
            this.$uibModal.open({
                backdrop: 'static',
                keyboard: true,
                windowClass: 'question-editor-modal',
                component: 'noShows',
                resolve: {
                    noShows: () => this.noShows
                }
            });

    }
}

angular.module('app.review').component('reviewList', ReviewListComponent);