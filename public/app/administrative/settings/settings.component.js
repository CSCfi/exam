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

angular.module('app.administrative.settings')
    .component('settings', {
        templateUrl: '/assets/app/administrative/settings/settings.template.html',
        controller: ['$translate', '$http', 'Settings', 'toast',
            function ($translate, $http, Settings, toast) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.settings = {};
                    ctrl.settings.eula = Settings.agreement.get();
                    Settings.deadline.get(function (deadline) {
                        deadline.value = parseInt(deadline.value);
                        ctrl.settings.deadline = deadline;
                    });
                    Settings.reservationWindow.get(function (window) {
                        window.value = parseInt(window.value);
                        ctrl.settings.reservationWindow = window;
                    });
                };

                ctrl.updateAgreement = function () {
                    Settings.agreement.update(ctrl.settings.eula,
                        function () {
                            toast.info($translate.instant("sitnet_user_agreement") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.updateDeadline = function () {
                    Settings.deadline.update(ctrl.settings.deadline,
                        function () {
                            toast.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.updateReservationWindow = function () {
                    Settings.reservationWindow.update(ctrl.settings.reservationWindow,
                        function () {
                            toast.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                ctrl.showAttributes = function () {
                    $http.get('/attributes').then(function (resp) {
                        ctrl.attributes = resp.data;
                    });
                };
            }
        ]
    });
