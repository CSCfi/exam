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

'use strict';

angular.module('app.review')
    .component('rInspection', {
        templateUrl: '/assets/app/review/assessment/grading/inspection.template.html',
        bindings: {
            inspection: '<',
            user: '<',
            disabled: '<',
            onInspection: '&'
        },
        controller: ['$translate', 'ExamRes', 'toast',
            function ($translate, ExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reviewStatuses = [
                        {
                            'key': true,
                            'value': $translate.instant('sitnet_ready')
                        },
                        {
                            'key': false,
                            'value': $translate.instant('sitnet_in_progress')
                        }
                    ];
                };

                vm.setInspectionStatus = function () {
                    if (vm.inspection.user.id === vm.user.id) {
                        ExamRes.inspectionReady.update({
                            id: vm.inspection.id,
                            ready: vm.inspection.ready
                        }, function (result) {
                            toast.info($translate.instant('sitnet_exam_updated'));
                            vm.inspection.ready = result.ready;
                            vm.onInspection();
                        }, function (error) {
                            toast.error(error.data);
                        });
                    }
                };

            }

        ]
    });
