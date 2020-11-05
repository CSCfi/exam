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

import { ExamParticipation } from '../../../exam/exam.model';

interface Participations {
    [room: string]: ExamParticipation[];
}

export const RoomStatisticsComponent: angular.IComponentOptions = {
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
                    <th ng-repeat="room in $ctrl.rooms">{{room.split('___')[1]}}</th>
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
    controller: class RoomStatisticsComponentController implements angular.IComponentController {
        queryParams: { start: string; end: string };
        participations: Participations;
        rooms: string[];
        months: Date[];

        constructor(private $http: angular.IHttpService) {
            'ngInject';
        }

        listParticipations = () => {
            this.$http
                .get('/app/reports/participations', { params: this.queryParams })
                .then((resp: angular.IHttpResponse<Participations>) => {
                    this.participations = resp.data;
                    if (Object.values(this.participations).flat().length > 0) {
                        this.rooms = Object.keys(this.participations);
                        this.groupByMonths();
                    } else {
                        this.rooms = [];
                        this.months = [];
                    }
                });
        };

        totalParticipations = (month: Date, room: string) => {
            if (!this.participations) return 0;
            const isWithinBounds = (p: ExamParticipation) => {
                const date = new Date(p.externalExam ? p.externalExam.started : p.exam.created);
                const current = new Date(month);
                const min = new Date(current.getFullYear(), current.getMonth(), 1);
                const max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                return date > min && date < max;
            };
            const rp = room ? this.participations[room] : Object.values(this.participations).flat();
            return month ? rp.filter(isWithinBounds).length : rp.length;
        };

        private groupByMonths = () => {
            if (Object.keys(this.participations).length === 0) {
                return [];
            }
            const months: Date[] = [];
            const limits = this.getMinAndMaxDates();
            months.push(limits.min);
            let current = new Date(limits.min);
            let next = new Date(new Date(current).setMonth(current.getMonth() + 1));
            const last = new Date(limits.max);
            while (this.isBefore(next, last)) {
                months.push(next);
                current = next;
                next = new Date(new Date(current).setMonth(current.getMonth() + 1));
            }
            if (this.isBefore(new Date(limits.min), last)) {
                months.push(limits.max);
            }
            this.months = months;
        };

        private isBefore = (a: Date, b: Date) =>
            a.getFullYear() < b.getFullYear() || (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth());

        private getMinAndMaxDates = (): { min: Date; max: Date } => {
            const dates: Date[] = Object.values(this.participations)
                .flatMap(ps =>
                    ps
                        .filter(p => p.exam || p.externalExam)
                        .map(p => (p.externalExam ? p.externalExam.started : p.exam.created))
                        .map(d => new Date(d)),
                )
                .sort((a, b) => a.getTime() - b.getTime());
            let minDate = dates[0];
            // Set min date to which one is earlier: participation or search date
            if (this.queryParams.start && new Date(this.queryParams.start) < minDate) {
                minDate = new Date(this.queryParams.start);
            }
            // Set max date to either now or requested end date (if any)
            if (this.queryParams.end) {
                dates.push(new Date(this.queryParams.end));
            } else {
                dates.push(new Date());
            }
            const maxDate = dates[dates.length - 1];
            return { min: minDate, max: maxDate };
        };
    },
};

angular.module('app.administrative.statistics').component('roomStatistics', RoomStatisticsComponent);
