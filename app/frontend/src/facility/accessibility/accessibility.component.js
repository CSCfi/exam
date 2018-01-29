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

angular.module('app.facility.accessibility')
    .component('accessibility', {
        template: require('./accessibility.template.html'),
        controller: ['$translate', '$http', function ($translate, $http) {

            const vm = this;

            vm.$onInit = function () {
                vm.newItem = {};
                $http.get('/app/accessibility').then(function (resp) {
                    vm.accessibilities = resp.data;
                });
            };

            vm.add = function (item) {
                $http.post('/app/accessibility', item).then(function (resp) {
                    vm.accessibilities.push(resp.data);
                    toast.info($translate.instant("sitnet_accessibility_added"));
                });
            };

            vm.update = function (accessibility) {
                $http.put('/app/accessibility', accessibility).then(function () {
                    toast.info($translate.instant("sitnet_accessibility_updated"));
                });
            };

            vm.remove = function (accessibility) {
                $http.delete('/app/accessibility/' + accessibility.id).then(function () {
                    vm.accessibilities.splice(vm.accessibilities.indexOf(accessibility), 1);
                    toast.info($translate.instant("sitnet_accessibility_removed"));
                });
            };
        }]
    });
