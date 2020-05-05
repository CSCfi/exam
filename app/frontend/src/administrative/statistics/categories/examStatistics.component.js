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

angular.module('app.administrative.statistics').component('examStatistics', {
    template: `
        <div class="detail-row">
            <div class="col-md-12">
                <button class="btn btn-primary" ng-click="$ctrl.listExams()">{{'sitnet_search' | translate}}</button>
            </div>
        </div>
        <div class="top-row">
            <div class="col-md-12">
                <h3>{{'sitnet_most_popular_exams' | translate}}</h3>
            </div>
        </div>
        <div class="detail-row">
            <div class="col-md-12" ng-show="$ctrl.exams.length > 0">
                <table class="table table-striped table-condensed">
                    <thead>
                    <tr>
                        <th>{{'sitnet_rank' | translate}}</th>
                        <th>{{'sitnet_exam' | translate}}</th>
                        <th>{{'sitnet_amount_exams' | translate}}</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr ng-repeat="exam in $ctrl.exams | orderBy:['-participations', 'name'] as sorted">
                        <td>{{$ctrl.getRank($index, sorted)}}.</td>
                        <td>{{exam.name}}</td>
                        <td>{{exam.participations}}</td>
                    </tr>
                    </tbody>
                    <tfoot>
                    <tr>
                        <td colspan="2"><b>{{ 'sitnet_total' | translate }}</b></td>
                        <td><b>{{ $ctrl.totalExams() }}</b></td>
                    </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        `,
    bindings: {
        queryParams: '<',
    },
    controller: [
        'Statistics',
        function(Statistics) {
            const vm = this;

            vm.$onInit = function() {
                vm.listExams();
            };

            vm.totalExams = function() {
                return vm.exams.reduce(function(a, b) {
                    return a + b.participations;
                }, 0);
            };

            vm.listExams = function() {
                Statistics.exams.query(vm.queryParams, function(exams) {
                    vm.exams = exams;
                });
            };

            vm.getRank = function(index, items) {
                const prev = Math.max(0, index - 1);
                if (items[prev].participations === items[index].participations) {
                    items[index].rank = items[prev].rank || 0;
                    return (items[prev].rank || 0) + 1;
                }
                items[index].rank = index;
                return index + 1;
            };
        },
    ],
});
