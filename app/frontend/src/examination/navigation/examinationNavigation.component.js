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

angular.module('app.examination').component('examinationNavigation', {
    template: require('./examinationNavigation.template.html'),
    bindings: {
        exam: '<',
        activeSection: '<',
        onSelect: '&',
    },
    controller: [
        function() {
            const vm = this;

            let _pages = [];

            vm.$onInit = function() {
                _pages = vm.exam.examSections.map(function(es) {
                    return { id: es.id, text: es.name, type: 'section', valid: true };
                });
                // Add guide page
                _pages.unshift({ text: 'sitnet_exam_guide', type: 'guide', valid: true });
                setupNavigation();
            };

            vm.$onChanges = function(changes) {
                if (changes.activeSection) {
                    setupNavigation(); // Active page did change
                }
            };

            const setupNavigation = function() {
                if (angular.isUndefined(vm.activeSection)) {
                    vm.next = _pages[1];
                    vm.prev = { valid: false };
                } else {
                    const nextIndex = nextPageIndex();
                    vm.next = nextIndex > -1 ? _pages[nextIndex] : { valid: false };
                    const prevIndex = prevPageIndex();
                    vm.prev = prevIndex > -1 ? _pages[prevIndex] : { valid: false };
                }
            };

            const activePageIndex = function() {
                const page = _pages.filter(function(p) {
                    return vm.activeSection.id === p.id;
                })[0];
                return _pages.indexOf(page);
            };

            const nextPageIndex = function() {
                const activeIndex = activePageIndex();
                return activeIndex + 1 === _pages.length ? -1 : activeIndex + 1;
            };

            const prevPageIndex = function() {
                return activePageIndex() - 1;
            };

            vm.nextPage = function() {
                vm.onSelect({ page: vm.next });
            };

            vm.previousPage = function() {
                vm.onSelect({ page: vm.prev });
            };
        },
    ],
});
