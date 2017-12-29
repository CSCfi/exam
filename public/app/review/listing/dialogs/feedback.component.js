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
    .component('reviewFeedback', {
        templateUrl: '/assets/app/review/listing/dialogs/feedback.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$scope', 'Assessment', function ($scope, Assessment) {

            var vm = this;

            vm.$onInit = function () {
                vm.exam = vm.resolve.exam;
            };

            vm.ok = function () {
                if (!vm.exam.examFeedback) {
                    vm.exam.examFeedback = {};
                }
                Assessment.saveFeedback(vm.exam);
                vm.close();
            };
            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };

            // Close modal if user clicked the back button and no changes made
            $scope.$on('$routeChangeStart', function () {
                if (!window.onbeforeunload) {
                    vm.cancel();
                }
            });

        }]
    });
