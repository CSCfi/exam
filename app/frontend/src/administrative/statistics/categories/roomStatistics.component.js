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

angular.module('app.administrative.statistics').component('roomStatistics', {
    template: `
        <div class="detail-row">
            <div class="col-md-12">
                <button class="btn btn-primary" ng-click="$ctrl.listParticipations()">{{'sitnet_search' | translate}}</button>
            </div>
        </div>
        <div class="main-row">
            <div class="col-md-12" style="overflow: auto">
                <table class="table table-condensed table-bordered ">
                    <thead>
                    <th class="warning">{{'sitnet_year' | translate}}</th>
                    <th class="warning">{{'sitnet_month' | translate}}</th>
                    <th ng-repeat="room in $ctrl.rooms">{{room.split(':')[1]}}</th>
                    <th class="success">{{'sitnet_total' | translate}}</th>
                    </thead>
                    <tbody>
                    <tr ng-repeat="month in $ctrl.months">
                        <td class="warning">{{month | date:'yyyy'}}</td>
                        <td class="warning">{{month | date:'M'}}</td>
                        <td ng-repeat="room in $ctrl.rooms">{{$ctrl.totalParticipations(month, room)}}</td>
                        <td class="success">{{$ctrl.totalParticipations(month)}}</td>
                    </tr>
                    </tbody>
                    <tfoot>
                    <tr class="success">
                        <td colspan="2"><b>{{ 'sitnet_total' | translate }}</b></td>
                        <td ng-repeat="room in $ctrl.rooms">{{$ctrl.totalParticipations(null, room)}}</td>
                        <td><b>{{ $ctrl.totalParticipations() }}</b></td>
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
                vm.listParticipations();
            };

            vm.totalParticipations = function(month, room) {
                let total = 0;

                const isWithinBounds = function(p) {
                    const date = new Date(p.exam.created);
                    const current = new Date(month);
                    const min = new Date(current.getFullYear(), current.getMonth(), 1);
                    const max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                    return date > min && date < max;
                };

                for (const k in vm.participations) {
                    if (vm.participations.hasOwnProperty(k)) {
                        if (room && k !== room) {
                            continue;
                        }
                        if (month) {
                            total += vm.participations[k].filter(isWithinBounds).length;
                        } else {
                            total += vm.participations[k].length;
                        }
                    }
                }
                return total;
            };

            const isBefore = function(a, b) {
                return a.getYear() < b.getYear() || (a.getYear() === b.getYear() && a.getMonth() < b.getMonth());
            };

            const groupByMonths = function() {
                if (vm.participations.length === 0) {
                    return [];
                }
                const months = [];
                const limits = getMinAndMaxDates();
                months.push(limits.min);
                let current = new Date(limits.min);
                let next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                const last = new Date(limits.max);
                while (isBefore(next, last)) {
                    months.push(next.getTime());
                    current = next;
                    next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                }
                months.push(limits.max);
                vm.months = months;
            };

            const getMinAndMaxDates = function() {
                let dates = [];
                for (const k in vm.participations) {
                    if (vm.participations.hasOwnProperty(k)) {
                        dates = dates.concat(
                            vm.participations[k].map(function(p) {
                                return p.exam.created;
                            }),
                        );
                    }
                }
                const minDate = Math.min.apply(null, dates);
                // Set max date to either now or requested end date (if any)
                if (vm.queryParams.endDate) {
                    dates.push(Date.parse(vm.queryParams.endDate));
                } else {
                    dates.push(new Date().getTime());
                }
                const maxDate = Math.max.apply(null, dates);
                return { min: minDate, max: maxDate };
            };

            vm.listParticipations = function() {
                Statistics.participations.find(vm.queryParams).$promise.then(function(data) {
                    vm.participations = data;
                    vm.rooms = Object.keys(data);
                    groupByMonths();
                });
            };
        },
    ],
});
