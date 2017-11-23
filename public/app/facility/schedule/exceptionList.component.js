'use strict';
angular.module('app.facility.schedule')
    .component('exceptionList', {
        templateUrl: '/assets/app/facility/schedule/exceptionList.template.html',
        bindings: {
            room: '<',
            hideButton: '<',
            hideTitle: '<',
            filter: '<',
            onCreate: '&',
            onDelete: '&'
        },
        controller: ['Room',
            function (Room) {

                var vm = this;

                vm.$onInit = function () {
                };

                vm.formatDate = function (exception) {
                    var fmt = 'DD.MM.YYYY HH:mm';
                    var start = moment(exception.startDate);
                    var end = moment(exception.endDate);
                    return start.format(fmt) + ' - ' + end.format(fmt);
                };

                vm.addException = function () {
                    Room.openExceptionDialog(vm.onCreate);
                };

                vm.deleteException = function (exception) {
                    vm.onDelete({exception: exception});
                };
            }]
    });