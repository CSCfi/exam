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

angular.module('app.administrative.settings')
    .component('settings', {
        template: require('./settings.template.html'),
        controller: ['$translate', '$http', 'Settings',
            function ($translate, $http, Settings) {

                const vm = this;

                vm.$onInit = function () {
                    vm.settings = {};
                    vm.settings.eula = Settings.agreement.get();
                    Settings.deadline.get(function (deadline) {
                        deadline.value = parseInt(deadline.value);
                        vm.settings.deadline = deadline;
                    });
                    Settings.reservationWindow.get(function (window) {
                        window.value = parseInt(window.value);
                        vm.settings.reservationWindow = window;
                    });
                };

                vm.updateAgreement = function () {
                    Settings.agreement.update(vm.settings.eula,
                        function () {
                            toast.info($translate.instant("sitnet_user_agreement") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.updateDeadline = function () {
                    Settings.deadline.update(vm.settings.deadline,
                        function () {
                            toast.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.updateReservationWindow = function () {
                    Settings.reservationWindow.update(vm.settings.reservationWindow,
                        function () {
                            toast.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.showAttributes = function () {
                    $http.get('/attributes').then(function (resp) {
                        vm.attributes = resp.data;
                    });
                };
            }
        ]
    });
