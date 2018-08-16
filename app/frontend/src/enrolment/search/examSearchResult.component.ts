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
import { Exam } from '../../exam/exam.model';
import { EnrolmentService } from '../enrolment.service';

export const ExamSearchResultComponent: angular.IComponentOptions = {
    template: require('./examSearchResult.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<'
    },
    controller: class ExamSearchResultController implements angular.IComponentController {
        exam: Exam;
        collaborative: boolean;
        enrolling: boolean;

        constructor(
            private $location: angular.ILocationService,
            private Enrolment: EnrolmentService) {
            'ngInject';
        }

        enrollForExam = () => {
            if (this.enrolling) {
                return;
            }
            this.enrolling = true;
            this.Enrolment.checkAndEnroll(this.exam, this.collaborative)
                .then(() => this.enrolling = false)
                .catch(angular.noop);
        }

        makeReservation = () => this.$location.path('/calendar/' + this.exam.id);

    }
};

angular.module('app.enrolment').component('examSearchResult', ExamSearchResultComponent);
