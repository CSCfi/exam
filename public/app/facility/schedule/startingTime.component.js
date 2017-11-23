'use strict';
angular.module('app.facility.schedule')
    .component('startingTime', {
        templateUrl: '/assets/app/facility/schedule/startingTime.template.html',
        bindings: {
            roomIds: '<',
            startingHours: '<'
        },
        controller: ['Room', function (Room) {
            var vm = this;

            vm.$onInit = function () {
                vm.examStartingHours = Array.apply(null, new Array(24)).map(function (x, i) {
                    return {startingHour: i + ":00", selected: true};
                });
                if (vm.startingHours && vm.startingHours.length > 0) {
                    var startingHours = vm.startingHours.map(function (hour) {
                        return moment(hour.startingHour);
                    });
                    vm.examStartingHourOffset = startingHours[0].minute();
                    startingHours = startingHours.map(function (hour) {
                        return hour.format("H:mm");
                    });
                    vm.setStartingHourOffset();
                    vm.examStartingHours.forEach(function (hour) {
                        hour.selected = startingHours.indexOf(hour.startingHour) !== -1;
                    });
                }
            };

            vm.updateStartingHours = function () {
                Room.updateStartingHours(vm.examStartingHours, vm.examStartingHourOffset, vm.roomIds)
                    .then(function () {
                        if (vm.startingHours) {
                            vm.startingHours = vm.examStartingHours;
                        }
                    });
            };

            vm.toggleAllExamStartingHours = function () {
                var anySelected = vm.examStartingHours.some(function (hours) {
                    return hours.selected;
                });
                vm.examStartingHours.forEach(function (hours) {
                    hours.selected = !anySelected;
                });
            };

            vm.setStartingHourOffset = function () {
                vm.examStartingHourOffset = vm.examStartingHourOffset || 0;
                vm.examStartingHours.forEach(function (hours) {
                    hours.startingHour = hours.startingHour.split(':')[0] + ':' + zeropad(vm.examStartingHourOffset);
                });
            };

            vm.anyStartingHoursSelected = function () {
                return vm.examStartingHours.some(function (hours) {
                    return hours.selected;
                });
            };

            function zeropad(n) {
                n += '';
                return n.length > 1 ? n : '0' + n;
            }
        }]
    });