'use strict';
angular.module('app.review')
    .component('archiveDownload', {
        templateUrl: '/assets/app/review/listing/dialogs/archiveDownload.template.html',
        bindings: {
            close: '&',
            dismiss: '&'
        },
        controller: ['$translate', function ($translate) {

            var vm = this;

            vm.$onInit = function () {
                vm.params = {startDate: new Date(), endDate: new Date()};
            };

            vm.startDateChanged = function (date) {
                vm.params.startDate = date;
            };

            vm.endDateChanged = function (date) {
                vm.params.endDate = date;
            };

            vm.ok = function () {
                var start, end;
                if (vm.params.startDate) {
                    start = moment(vm.params.startDate);
                }
                if (vm.params.endDate) {
                    end = moment(vm.params.endDate);
                }
                if (start && end && end < start) {
                    toastr.error($translate.instant('sitnet_endtime_before_starttime'));
                } else {
                    vm.close({
                        $value: {
                            'start': start.format('DD.MM.YYYY'),
                            'end': end.format('DD.MM.YYYY')
                        }
                    });
                }
            };

            vm.cancel = function () {
                vm.dismiss({$value: 'cancel'});
            };
        }]
    });
