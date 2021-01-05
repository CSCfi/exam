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

export const StatisticsComponent: angular.IComponentOptions = {
    template: require('./statistics.template.html'),
    controller: class StatisticsComponentController implements angular.IComponentController {
        departments: { name: string; filtered: boolean }[];
        limitations: unknown;
        queryParams: { start?: Date; end?: Date; dept?: string };
        startDate: Date;
        endDate: Date;

        constructor(private $http: angular.IHttpService) {
            'ngInject';
        }

        $onInit() {
            this.departments = [];
            this.limitations = {};
            this.queryParams = {};

            this.$http
                .get('/app/reports/departments')
                .then(
                    (resp: angular.IHttpResponse<{ departments: string[] }>) =>
                        (this.departments = resp.data.departments.map(d => ({ name: d, filtered: false }))),
                );
        }

        private setQueryParams = () => {
            const params: { start?: Date; end?: Date; dept?: string } = {};
            if (this.startDate) {
                params.start = this.startDate;
            }
            if (this.endDate) {
                params.end = this.endDate;
            }
            const departments = this.departments.filter(d => d.filtered);
            if (departments.length > 0) {
                params.dept = departments.map(d => d.name).join();
            }
            this.queryParams = params;
        };

        setDepartmentFilter = (dept: { name: string; filtered: boolean }) => {
            dept.filtered = !dept.filtered;
            this.setQueryParams();
        };

        startDateChanged = (date: Date) => {
            this.startDate = date;
            this.setQueryParams();
        };

        endDateChanged = (date: Date) => {
            this.endDate = date;
            this.setQueryParams();
        };
    },
};

angular.module('app.administrative.statistics').component('statistics', StatisticsComponent);
