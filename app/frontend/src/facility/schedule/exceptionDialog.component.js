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

import angular from 'angular';
import toast from 'toastr';
import moment from 'moment';

angular.module('app.facility.schedule')
    .component('exceptionDialog', {
        template: require('./exceptionDialog.template.html'),
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', function ($translate) {

            const vm = this;

            vm.$onInit = function () {
                const now = new Date();
                now.setSeconds(0);
                now.setMilliseconds(0);
                vm.dateOptions = {
                    'starting-day': 1
                };
                vm.dateFormat = 'dd.MM.yyyy';

                vm.exception = { startDate: now, endDate: angular.copy(now), outOfService: true };
            };

            vm.onStartDateChange = function (date) {
                vm.exception.startDate = date;
            };

            vm.onEndDateChange = function (date) {
                vm.exception.endDate = date;
            };

            vm.ok = function () {
                const start = moment(vm.exception.startDate);
                const end = moment(vm.exception.endDate);
                if (end <= start) {
                    toast.error($translate.instant('sitnet_endtime_before_starttime'));
                    return;
                }
                vm.close({
                    $value: {
                        "startDate": start,
                        "endDate": end,
                        "outOfService": vm.exception.outOfService
                    }
                });
            };

            vm.cancel = function () {
                vm.dismiss({ $value: 'cancel' });
            };
        }]
    });
