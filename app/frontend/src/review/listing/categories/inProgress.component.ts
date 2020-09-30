/*
 * Copyright (c) 2018 Exam Consortium
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

import { Exam, ExamParticipation } from '../../../exam/exam.model';
import { SessionService, User } from '../../../session/session.service';
import { FileService } from '../../../utility/file/file.service';

export const InProgressReviewsComponent: angular.IComponentOptions = {
    template: require('./inProgress.template.html'),
    bindings: {
        exam: '<',
        reviews: '<',
    },
    require: {
        parentCtrl: '^^reviewList',
    },
    controller: class InProgressReviewsController implements angular.IComponentController, angular.IOnInit {
        exam: Exam;
        reviews: ExamParticipation[];
        data: {
            items: any[];
            filtered: any[];
            toggle: boolean;
            pageSize: number;
            predicate: string;
            page: number;
            filter: string;
        };
        parentCtrl: {
            collaborative: boolean;
        };

        constructor(
            private $uibModal: IModalService,
            private ReviewList: any,
            private Session: SessionService,
            private Files: FileService,
        ) {
            'ngInject';
        }

        $onInit() {
            this.data = this.ReviewList.prepareView(this.reviews, this.handleOngoingReviews);
            this.data.predicate = 'deadline';
        }

        isOwner = (user: User) => this.exam && this.exam.examOwners.some(o => o.id === user.id);

        showId = () => this.Session.getUser().isAdmin && this.exam.anonymous;

        getLinkToAssessment = (review: ExamParticipation & { _id: string }) =>
            this.parentCtrl.collaborative
                ? `/assessments/collaborative/${this.exam.id}/${review._id}`
                : `/assessments/${review.exam.id}`;

        pageSelected = (page: number) => (this.data.page = page);

        applyFreeSearchFilter = () =>
            (this.data.filtered = this.ReviewList.applyFilter(this.data.filter, this.data.items));

        getAnswerAttachments = () =>
            this.$uibModal
                .open({
                    backdrop: 'static',
                    keyboard: true,
                    animation: true,
                    component: 'archiveDownload',
                })
                .result.then(params =>
                    this.Files.download(`/app/exam/${this.exam.id}/attachments`, `${this.exam.id}.tar.gz`, params),
                )
                .catch(angular.noop);

        private handleOngoingReviews = review =>
            (review.displayName = this.ReviewList.getDisplayName(review, this.parentCtrl.collaborative));
    },
};

angular.module('app.review').component('rlInProgress', InProgressReviewsComponent);
