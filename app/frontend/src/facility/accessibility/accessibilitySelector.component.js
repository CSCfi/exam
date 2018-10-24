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
    .component('accessibilitySelector', {
        template: require('./accessibilitySelector.template.html'),
        bindings: {
            room: '<'
        },
        controller: ['$translate', '$http', function ($translate, $http) {
            const vm = this;

            vm.$onInit = function () {
                $http.get('/app/accessibility').then(function (resp) {
                    vm.accessibilities = resp.data;
                });
            };

            vm.selectedAccessibilities = function () {
                return vm.room.accessibilities.length === 0 ? $translate.instant('sitnet_select') :
                    vm.room.accessibilities.map(function (ac) {
                        return ac.name;
                    }).join(", ");
            };

            vm.isSelected = function (ac) {
                return getIndexOf(ac) > -1;
            };

            vm.updateAccessibility = function (ac) {
                const index = getIndexOf(ac);
                if (index > -1) {
                    vm.room.accessibilities.splice(index, 1);
                } else {
                    vm.room.accessibilities.push(ac);
                }
                const ids = vm.room.accessibilities.map(function (item) {
                    return item.id;
                }).join(", ");

                $http.post('/app/room/' + vm.room.id + '/accessibility', { ids: ids })
                    .then(function () {
                        toast.info($translate.instant("sitnet_room_updated"));
                    });
            };

            function getIndexOf(ac) {
                return vm.room.accessibilities.map(function (a) {
                    return a.id;
                }).indexOf(ac.id);
            }
        }]
    });
