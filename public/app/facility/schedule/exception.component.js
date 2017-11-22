'use strict';
angular.module('app.facility.schedule')
    .component('exception', {
        templateUrl: '/assets/app/facility/schedule/exception.template.html',
        bindings: {
            close: '&',
            dismiss: '&',
            resolve: '<'
        },
        controller: ['$translate', 'toast', function ($translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                var now = new Date();
                now.setMinutes(0);
                now.setSeconds(0);
                now.setMilliseconds(0);
                vm.dateOptions = {
                    'starting-day': 1
                };
                vm.dateFormat = 'dd.MM.yyyy';

                vm.exception = {startDate: now, endDate: angular.copy(now), outOfService: true};
            };

            vm.ok = function () {
                var start = moment(vm.exception.startDate);
                var end = moment(vm.exception.endDate);
                if (end <= start) {
                    toast.error($translate.instant('sitnet_endtime_before_starttime'));
                    return;
                }
                vm.close({
                    $value: {
                        "startDate": start,
                        "endDate": end,
                        "outOfService": vm.exception.outOfService
                    }
                });
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };
        }]
    });