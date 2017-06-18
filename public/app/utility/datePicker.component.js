'use strict';
angular.module('app.utility')
    .component('datePicker', {
        templateUrl: '/assets/app/utility/datePicker.template.html',
        bindings: {
            initialDate: '<',
            onUpdate: '&',
            extra: '<',
            onExtraAction: '&?',
            extraText: '@'
        },
        controller: [
            function () {

                var vm = this;

                vm.$onInit = function () {
                    vm.date = vm.initialDate || new Date();
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
                }


            }]
    });


