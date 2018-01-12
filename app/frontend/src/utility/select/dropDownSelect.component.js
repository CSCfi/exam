/*
 *
 *  * Copyright (c) 2018 Exam Consortium
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */
'use strict';
import angular from 'angular';

angular.module('app.utility')
    .component('dropDownSelect', {
        template: require('./dropDownSelect.template.html'),
        bindings: {
            options: '<',
            placeholder: '@',
            onSelect: '&'
        },
        controller: [function () {
            const vm = this;

            vm.$onInit = function () {
                vm.placeholder = vm.placeholder || '-';
                vm.searchFilter = '';
            };

            vm.selectOption = function (option) {
                vm.selected = option;
                vm.onSelect({value: option.value || option.id});
            };

            vm.optionFilter = function (option) {
                return option.label &&
                    option.label.toLowerCase().includes(vm.searchFilter.toLowerCase());
            };

            vm.getClasses = function(opt) {
                const classes = [];
                if (vm.selected && vm.selected.id === opt.id) {
                    classes.push('active');
                }
                if (opt.isHeader) {
                    classes.push('dropdown-header');
                }
                return classes;
            };

            vm.clearSelection = function () {
                delete vm.selected;
                vm.onSelect();
            }
        }]
    });
