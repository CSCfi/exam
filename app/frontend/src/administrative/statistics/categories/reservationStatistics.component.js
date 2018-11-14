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
    .component('reservationStatistics', {
        template: `
        <div class="bottom-row">
            <div class="col-md-12">
                <button class="btn btn-primary" ng-click="$ctrl.listReservations()">{{'sitnet_search' | translate}}</button>
            </div>
        </div>
        <div class="top-row">
            <div class="col-md-2"><strong>{{'sitnet_total_reservations' | translate}}:</strong></div>
            <div class="col-md-10">{{$ctrl.reservations.length}}</div>
        </div>
        <div class="main-row">
            <div class="col-md-2"><strong>{{'sitnet_total_no_shows' | translate}}:</strong></div>
            <div class="col-md-10">{{$ctrl.noShows.length}}</div>
        </div>
        `,
        bindings: {
            queryParams: '<'
        },
        controller: ['Statistics', function (Statistics) {

            const vm = this;

            vm.$onInit = function () {
                vm.listReservations();
            };

            vm.listReservations = function () {
                Statistics.reservations.query(vm.queryParams, function (reservations) {
                    vm.reservations = reservations.filter(function (r) {
                        return !r.noShow;
                    });
                    vm.noShows = reservations.filter(function (r) {
                        return r.noShow;
                    });
                });
            };

        }]
    });

