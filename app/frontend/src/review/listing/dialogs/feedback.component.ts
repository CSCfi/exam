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

import { Exam } from '../../../exam/exam.model';

export const FeedbackComponent: angular.IComponentOptions = {
    template: require('./feedback.template.html'),
    bindings: {
        close: '&',
        dismiss: '&',
        resolve: '<',
    },
    controller: class FeedbackController implements angular.IComponentController {
        resolve: { exam: Exam };
        exam: Exam;
        close: () => unknown;
        dismiss: ({ $value: string }) => unknown;

        constructor(private $scope: angular.IScope, private $window: angular.IWindowService, private Assessment: any) {
            'ngInject';
            // Close modal if user clicked the back button and no changes made
            this.$scope.$on('$stateChangeStart', () => {
                if (!this.$window.onbeforeunload) {
                    this.cancel();
                }
            });
        }
        $onInit = () => (this.exam = this.resolve.exam);

        ok = () => {
            if (!this.exam.examFeedback) {
                this.exam.examFeedback = { comment: '', feedbackStatus: false };
            }
            this.Assessment.saveFeedback(this.exam);
            this.close();
        };

        cancel = () => this.dismiss({ $value: 'cancel' });
    },
};

angular.module('app.review').component('feedback', FeedbackComponent);
