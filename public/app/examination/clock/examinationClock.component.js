'use strict';

angular.module('app.examination')
    .component('examinationClock', {
        templateUrl: '/assets/app/examination/clock/examinationClock.template.html',
        bindings: {
            examHash: '<',
            onTimeout: '&'
        },
        controller: ['$timeout', '$http',
            function ($timeout, $http) {

                var vm = this;

                var _syncInterval = 15; // Interval for syncing time with backend in seconds
                var _secondsSinceSync = 0;
                var _poller = {};

                vm.$onInit = function () {
                    vm.alarmThreshold = 300; // If less than five minutes left alert user.
                    checkRemainingTime();
                };

                vm.$onDestroy = function () {
                    $timeout.cancel(_poller);
                };

                var checkRemainingTime = function () {
                    _secondsSinceSync++;
                    if (_secondsSinceSync > _syncInterval) {
                        // Sync time with backend
                        _secondsSinceSync = 0;
                        getRemainingTime();
                    } else if (vm.remainingTime) {
                        // Decrease seconds
                        vm.remainingTime--;
                    }
                    if (vm.remainingTime && vm.remainingTime < 0) {
                        onTimeout();
                    }

                    _poller = $timeout(checkRemainingTime, 1000);
                };

                var getRemainingTime = function () {
                    var req = $http.get('/app/time/' + vm.examHash);
                    req.success(function (reply) {
                        vm.remainingTime = parseInt(reply);
                    });
                };

                var onTimeout = function () {
                    $timeout.cancel(_poller);
                    vm.onTimeout();
                };

                var zeroPad = function (n) {
                    n += '';
                    return n.length > 1 ? n : '0' + n;
                };

                vm.formatRemainingTime = function () {
                    if (!vm.remainingTime) {
                        return '';
                    }
                    var hours = Math.floor(vm.remainingTime / 60 / 60);
                    var minutes = Math.floor(vm.remainingTime / 60) % 60;
                    var seconds = vm.remainingTime % 60;
                    return hours + ':' + zeroPad(minutes) + ':' + zeroPad(seconds);
                };
            }
        ]
    });
