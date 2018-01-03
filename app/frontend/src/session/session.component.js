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

angular.module('app.session')
    .component('session', {
        template: require('./session.template.html'),
        controller: ['$location', 'Session', '$rootScope',
            function ($location, Session, $rootScope) {

                const ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.user = Session.getUser();
                    ctrl.credentials = {};
                    Session.setLoginEnv(ctrl);
                };

                $rootScope.$on('devLogout', function () {
                    $location.url($location.path());
                    ctrl.user = Session.getUser();
                    ctrl.credentials = {};
                    Session.setLoginEnv(ctrl);
                });

                $rootScope.$on('examStarted', function () {
                    ctrl.hideNavBar = true;
                });

                $rootScope.$on('examEnded', function () {
                    ctrl.hideNavBar = false;
                });

                // dev-mode login, not usable with production environment
                ctrl.setUser= function (user) {
                    ctrl.user = user;
                };

            }
        ]
    });
