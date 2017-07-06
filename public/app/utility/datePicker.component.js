'use strict';
angular.module('app.utility')
    .component('datePicker', {
        templateUrl: '/assets/app/utility/datePicker.template.html',
        bindings: {
            onUpdate: '&',
            initialDate: '<?',
            extra: '<?',
            onExtraAction: '&?',
            extraText: '@?',
            modelOptions: '<?'
        },
        controller: [
            function () {

                var vm = this;

                vm.$onInit = function () {
                    if (angular.isUndefined(vm.modelOptions)) {
                        vm.modelOptions = {};
                    }
                    vm.date = angular.isUndefined(vm.initialDate) ? new Date() : vm.initialDate;
                    vm.showWeeks = true;
                    vm.dateOptions = {
                        startingDay: 1
                    };
                    vm.format = 'dd.MM.yyyy';
                };

                vm.openPicker = function ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    vm.opened = true;
                };

                vm.dateChanged = function () {
                    vm.onUpdate({date: vm.date});
                };

                vm.extraClicked = function () {
                    vm.onExtraAction({date: vm.date});
                };


            }]
    });


