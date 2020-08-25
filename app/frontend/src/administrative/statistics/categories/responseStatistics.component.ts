/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

export const ResponseStatisticsComponent: angular.IComponentOptions = {
    template: `
            <div class="bottom-row">
                <div class="col-md-12">
                    <button class="btn btn-primary" ng-click="$ctrl.listResponses()">{{'sitnet_search' | translate}}</button>
                </div>
            </div>
            <div class="top-row">
                <div class="col-md-2"><strong>{{'sitnet_assessed_exams' | translate}}:</strong></div>
                <div class="col-md-10">{{$ctrl.assessedExams.length}}</div>
            </div>
            <div class="top-row">
                <div class="col-md-2"><strong>{{'sitnet_unassessed_exams' | translate}}:</strong></div>
                <div class="col-md-10">{{$ctrl.unassessedExams.length}}</div>
            </div>
            <div class="top-row">
                <div class="col-md-2"><strong>{{'sitnet_aborted_exams' | translate}}:</strong></div>
                <div class="col-md-10">{{$ctrl.abortedExams.length}}</div>
            </div>
        `,
    bindings: {
        queryParams: '<',
    },
    controller: class ResponseStatisticsComponentController implements angular.IComponentController {
        queryParams: { start: string; end: string };
        assessedExams: Exam[];
        unassessedExams: Exam[];
        abortedExams: Exam[];

        constructor(private $http: angular.IHttpService) {
            'ngInject';
        }

        $onInit() {
            this.listResponses();
        }

        listResponses = () =>
            this.$http
                .get('/app/reports/responses', { params: this.queryParams })
                .then((resp: angular.IHttpResponse<Exam[]>) => {
                    this.assessedExams = resp.data.filter(
                        e => ['GRADED', 'GRADED_LOGGED', 'ARCHIVED', 'REJECTED', 'DELETED'].indexOf(e.state) > -1,
                    );
                    this.unassessedExams = resp.data.filter(
                        e => ['STUDENT_STARTED', 'REVIEW', 'REVIEW_STARTED'].indexOf(e.state) > -1,
                    );
                    this.abortedExams = resp.data.filter(e => e.state === 'ABORTED');
                });
    },
};

angular.module('app.administrative.statistics').component('responseStatistics', ResponseStatisticsComponent);
