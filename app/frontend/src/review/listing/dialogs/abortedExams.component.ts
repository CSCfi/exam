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
import * as toast from 'toastr';

import { Exam } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';

export const AbortedExamsComponent: angular.IComponentOptions = {
    template: require('./abortedExams.template.html'),
    bindings: {
        dismiss: '&',
        resolve: '<',
    },
    controller: class AbortedExamsController implements angular.IComponentController {
        resolve: { exam: Exam; abortedExams: Exam[] };
        exam: Exam;
        abortedExams: Exam[];
        dismiss: ({ $value: string }) => unknown;

        constructor(
            private $translate: angular.translate.ITranslateService,
            private $scope: angular.IScope,
            private $window: angular.IWindowService,
            private ExamRes: any,
            private Session: SessionService,
        ) {
            'ngInject';

            // Close modal if user clicked the back button and no changes made
            this.$scope.$on('$stateChangeStart', () => {
                if (!this.$window.onbeforeunload) {
                    this.cancel();
                }
            });
        }
        $onInit = () => {
            this.abortedExams = this.resolve.abortedExams;
            this.exam = this.resolve.exam;
        };
        showId = () => this.Session.getUser().isAdmin && this.exam.anonymous;
        permitRetrial = reservation => {
            this.ExamRes.reservation.update({ id: reservation.id }, () => {
                reservation.retrialPermitted = true;
                toast.info(this.$translate.instant('sitnet_retrial_permitted'));
            });
        };
        cancel = () => this.dismiss({ $value: 'cancel' });
    },
};

angular.module('app.review').component('abortedExams', AbortedExamsComponent);
