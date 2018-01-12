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

import angular from 'angular';

angular.module('app.administrative.statistics')
    .component('responseStatistics', {
        template: `
            <div class="bottom-row">
                <div class="col-md-12">
                    <button class="btn btn-primary" ng-click="$ctrl.listResponses()">{{'sitnet_search' | translate}}</button>
                </div>
            </div>
            <div class="top-row">
                <div class="col-md-2"><strong>{{'sitnet_assessed_exams' | translate}}:</strong></div>
                <div class="col-md-10">{{$ctrl.assessedExams.length}}</div>
            </div>
            <div class="top-row">
                <div class="col-md-2"><strong>{{'sitnet_unassessed_exams' | translate}}:</strong></div>
                <div class="col-md-10">{{$ctrl.unassessedExams.length}}</div>
            </div>
            <div class="top-row">
                <div class="col-md-2"><strong>{{'sitnet_aborted_exams' | translate}}:</strong></div>
                <div class="col-md-10">{{$ctrl.abortedExams.length}}</div>
            </div>
        `,
        bindings: {
            queryParams: '<'
        },
        controller: ['$translate', 'EXAM_CONF', 'Statistics',
            function ($translate, EXAM_CONF, Statistics) {

                const vm = this;

                vm.$onInit = function () {
                    vm.listResponses();
                };

                vm.listResponses = function () {
                    Statistics.responses.query(vm.queryParams, function (exams) {
                        vm.assessedExams = exams.filter(function (e) {
                            return ['GRADED', 'GRADED_LOGGED', 'ARCHIVED', 'REJECTED', 'DELETED'].indexOf(e.state) > -1;
                        });
                        vm.unassessedExams = exams.filter(function (e) {
                            return ['STUDENT_STARTED', 'REVIEW', 'REVIEW_STARTED'].indexOf(e.state) > -1;
                        });
                        vm.abortedExams = exams.filter(function (e) {
                            return e.state === 'ABORTED';
                        });
                    });
                };

            }]
    });

