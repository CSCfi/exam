/*
 * Copyright (c) 2018 Exam Consortium
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
    .component('devLogin', {
        template: require('./templates/dev_login.html'),
        bindings: {
            onLoggedIn: '&'
        },
        controller: ['Session',
            function (Session) {

                const vm = this;

                vm.$onInit = function () {
                    vm.credentials = {};
                };

                // dev-mode login, not usable with production environment
                vm.login = function () {
                    Session.login(vm.credentials.username, vm.credentials.password)
                        .then(function (user) {
                            vm.onLoggedIn({user: user});
                        });
                };

            }
        ]
    });
