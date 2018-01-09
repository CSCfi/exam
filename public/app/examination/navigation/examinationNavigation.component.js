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

angular.module('app.examination')
    .component('examinationNavigation', {
        template: '<!-- SECTION NAVIGATION ARROWS AND LABELS -->' +
        '<div class="row exam-navigation">' +
        '    <span class="col-md-12">' +
        '        <!-- PREVIOUS SECTION BUTTON -->' +
        '        <a class="green_button previous" ng-show="$ctrl.prev.valid" ng-click="$ctrl.previousPage()">' +
        '            <img class="arrow_icon" src="/assets/assets/images/icon_left_white.png"> {{ $ctrl.prev.text | translate }}' +
        '        </a>' +
        '        <!-- NEXT SECTION BUTTON -->' +
        '        <a class="green_button" ng-show="$ctrl.next.valid" ng-click="$ctrl.nextPage()">{{ $ctrl.next.text | translate }}' +
        '            <img class="arrow_icon" src="/assets/assets/images/icon_right_white.png">' +
        '        </a>' +
        '    </span>' +
        '</div>',
        bindings: {
            exam: '<',
            activeSection: '<',
            onSelect: '&'
        },
        controller: [
            function () {

                var vm = this;

                var _pages = [];

                vm.$onInit = function () {
                    _pages = vm.exam.examSections.map(function (es) {
                        return {id: es.id, text: es.name, type: 'section', valid: true};
                    });
                    // Add guide page
                    _pages.unshift({text: 'sitnet_exam_guide', type: 'guide', valid: true});
                    setupNavigation();
                };

                vm.$onChanges = function (changes) {
                    if (changes.activeSection) {
                        setupNavigation(); // Active page did change
                    }
                };

                var setupNavigation = function () {
                    if (angular.isUndefined(vm.activeSection)) {
                        vm.next = _pages[1];
                        vm.prev = {valid: false};
                    } else {
                        var nextIndex = nextPageIndex();
                        vm.next = nextIndex > -1 ? _pages[nextIndex] : {valid: false};
                        var prevIndex = prevPageIndex();
                        vm.prev = prevIndex > -1 ? _pages[prevIndex] : {valid: false};
                    }
                };

                var activePageIndex = function () {
                    var page = _pages.filter(function (p) {
                        return vm.activeSection.id === p.id;
                    })[0];
                    return _pages.indexOf(page);
                };

                var nextPageIndex = function () {
                    var activeIndex = activePageIndex();
                    return activeIndex + 1 === _pages.length ? -1 : activeIndex + 1;
                };

                var prevPageIndex = function () {
                    return activePageIndex() - 1;
                };

                vm.nextPage = function () {
                    vm.onSelect({page: vm.next});
                };

                vm.previousPage = function () {
                    vm.onSelect({page: vm.prev});
                };

            }
        ]
    });
