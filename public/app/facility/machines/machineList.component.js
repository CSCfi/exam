'use strict';
angular.module('app.facility.machines')
    .component('machineList', {
        templateUrl: '/assets/app/facility/machines/machineList.template.html',
        bindings: {
            room: '<'
        },
        controller: ['Machines', '$translate', 'toast', function (Machines, $translate, toast) {

            var vm = this;

            vm.$onInit = function () {
                vm.showMachines = true;
            };

            vm.toggleShow = function () {
                vm.showMachines = !vm.showMachines
            };

            vm.countMachineAlerts = function () {
                if (!vm.room) return 0;
                return vm.room.examMachines.filter(function (m) {
                    return m.outOfService;
                }).length;
            };

            vm.countMachineNotices = function () {
                if (!vm.room) return 0;
                return vm.room.examMachines.filter(function (m) {
                    return !m.outOfService && m.statusComment;
                }).length;
            };

            vm.addNewMachine = function () {
                var newMachine = {};

                Machines.machine.insert({id: vm.room.id}, newMachine, function (machine) {
                    toast.info($translate.instant("sitnet_machine_added"));
                    vm.room.examMachines.push(machine);
                }, function (error) {
                    toast.error(error.data);
                });
            };

        }]
    });