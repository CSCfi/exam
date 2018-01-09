/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

'use strict';
angular.module('app.review')
    .component('archiveDownload', {
        templateUrl: '/assets/app/review/listing/dialogs/archiveDownload.template.html',
        bindings: {
            close: '&',
            dismiss: '&'
        },
        controller: ['$translate', 'toast', function ($translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.params = {startDate: new Date(), endDate: new Date()};
            };

            vm.startDateChanged = function (date) {
                vm.params.startDate = date;
            };

            vm.endDateChanged = function (date) {
                vm.params.endDate = date;
            };

            vm.ok = function () {
                var start, end;
                if (vm.params.startDate) {
                    start = moment(vm.params.startDate);
                }
                if (vm.params.endDate) {
                    end = moment(vm.params.endDate);
                }
                if (start && end && end < start) {
                    toast.error($translate.instant('sitnet_endtime_before_starttime'));
                } else {
                    vm.close({
                        $value: {
                            'start': start.format('DD.MM.YYYY'),
                            'end': end.format('DD.MM.YYYY')
                        }
                    });
                }
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };
        }]
    });
