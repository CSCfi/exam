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

angular.module('app.review')
    .component('rInspectionComments', {
        template: require('./inspectionComments.template.html'),
        bindings: {
            exam: '<',
            addingDisabled: '<',
            addingVisible: '<'
        },
        controller: ['$uibModal', 'ExamRes',
            function ($modal, ExamRes) {

                const vm = this;

                vm.addInspectionComment = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'rInspectionComment'
                    }).result.then(function (params) {
                        ExamRes.inspectionComment.create({
                            id: vm.exam.id,
                            comment: params.comment
                        }, function (comment) {
                            vm.exam.inspectionComments.unshift(comment);
                        });
                    });
                };

            }

        ]
    });
