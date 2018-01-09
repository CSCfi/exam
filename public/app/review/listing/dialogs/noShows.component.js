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
    .component('noShows', {
        templateUrl: '/assets/app/review/listing/dialogs/noShows.template.html',
        bindings: {
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', '$scope', 'ExamRes', 'toast', function ($translate, $scope, ExamRes, toast) {

            //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.

            var vm = this;

            vm.$onInit = function () {
                vm.noShows = vm.resolve.noShows;
            };

            vm.permitRetrial = function (reservation) {
                ExamRes.reservation.update({id: reservation.id}, function () {
                    reservation.retrialPermitted = true;
                    toast.info($translate.instant('sitnet_retrial_permitted'));
                });
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
