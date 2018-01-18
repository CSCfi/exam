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

angular.module('app.examination')
    .component('examinationClock', {
        template:
        '<div class="floating-clock">\n' +
        '    <div class="header-wrapper">\n' +
        '        <span ng-if="$ctrl.showRemainingTime" class="exam-clock-text">\n' +
        '            <span class="sitnet-white">{{\'sitnet_exam_time_left\' | translate}}: </span>\n' +
        '        </span>\n' +
        '        <span class="exam-clock">\n' +
        '            <span ng-if="$ctrl.showRemainingTime"\n' +
        '                ng-class="$ctrl.remainingTime <= $ctrl.alarmThreshold ? \'sitnet-text-alarm\' : \'\'">\n' +
        '                {{$ctrl.formatRemainingTime()}}\n' +
        '            </span>\n' +
        '            <span ng-if="!$ctrl.showRemainingTime" class="clock-hide"><i>{{\'sitnet_clock_hidden\' | translate}}</i></span>\n' +
        '        </span>\n' +
        '        <span>\n' +
        '            <img ng-click="$ctrl.showRemainingTime = !$ctrl.showRemainingTime"\n' +
        '                 src="/assets/assets/images/icon_clock.svg" alt="exam"\n' +
        '                 onerror="this.onerror=null;this.src=\'/assets/assets/images/icon_clock.png\';"/>\n' +
        '        </span>\n' +
        '    </div>\n' +
        '</div>\n',
        bindings: {
            examHash: '<',
            onTimeout: '&'
        },
        controller: ['$timeout', '$http',
            function ($timeout, $http) {

                const vm = this;

                const _syncInterval = 15; // Interval for syncing time with backend in seconds
                let _secondsSinceSync = _syncInterval + 1; // Init so that we sync right away
                let _poller = {};

                vm.$onInit = function () {
                    vm.alarmThreshold = 300; //  Alert user if less than five minutes left.
                    vm.showRemainingTime = true;
                    checkRemainingTime();
                };

                vm.$onDestroy = function () {
                    $timeout.cancel(_poller);
                };

                const checkRemainingTime = function () {
                    _secondsSinceSync++;
                    if (_secondsSinceSync > _syncInterval) {
                        // Sync time with backend
                        _secondsSinceSync = 0;
                        getRemainingTime();
                    } else if (angular.isDefined(vm.remainingTime)) {
                        // Decrease seconds
                        vm.remainingTime--;
                    }
                    if (angular.isDefined(vm.remainingTime) && vm.remainingTime <= 0) {
                        onTimeout();
                    }

                    _poller = $timeout(checkRemainingTime, 1000);
                };

                const getRemainingTime = function () {
                    const req = $http.get('/app/time/' + vm.examHash);
                    req.then(function (resp) {
                        vm.remainingTime = parseInt(resp.data);
                    });
                };

                const onTimeout = function () {
                    $timeout.cancel(_poller);
                    vm.onTimeout();
                };

                const zeroPad = function (n) {
                    n += '';
                    return n.length > 1 ? n : '0' + n;
                };

                vm.formatRemainingTime = function () {
                    if (!vm.remainingTime) {
                        return '';
                    }
                    const hours = Math.floor(vm.remainingTime / 60 / 60);
                    const minutes = Math.floor(vm.remainingTime / 60) % 60;
                    const seconds = vm.remainingTime % 60;
                    return hours + ':' + zeroPad(minutes) + ':' + zeroPad(seconds);
                };
            }
        ]
    });
