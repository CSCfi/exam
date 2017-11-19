'use strict';
angular.module('app.facility.schedule')
    .component('openHours', {
        templateUrl: '/assets/app/facility/schedule/openHours.template.html',
        bindings: {
            room: '<',
            week: '<'
        },
        controller: ['Room', 'DateTime', 'toast', '$translate', '$scope',
            function (Room, DateTime, toast, $translate, $scope) {

            var vm = this;

            vm.$onInit = function () {
                vm.weekdayNames = DateTime.getWeekdayNames();
                vm.times = Room.getTimes();
                vm.room.defaultWorkingHours.forEach(function (daySlot) {
                    var timeSlots = slotToTimes(daySlot);
                    setSelected(daySlot.weekday, timeSlots);
                });
            };

            vm.timeRange = function () {
                return Array.apply(null, new Array(vm.times.length - 1)).map(function (x, i) {
                    return i;
                });
            };

            vm.getWeekdays = function () {
                return Object.keys(vm.week);
            };

            vm.getType = function (day, time) {
                return vm.week[day][time].type;
            };

            vm.calculateTime = function (index) {
                return (vm.times[index] || "0:00") + " - " + vm.times[index + 1];
            };

            vm.selectSlot = function (day, time) {
                var i = 0, status = vm.week[day][time].type;
                if (status === 'accepted') { // clear selection
                    vm.week[day][time].type = '';
                    return;
                }
                if (status === 'selected') { // mark everything hereafter as free until next block
                    for (i = 0; i < vm.week[day].length; ++i) {
                        if (i >= time) {
                            if (vm.week[day][i].type === 'selected') {
                                vm.week[day][i].type = '';
                            } else {
                                break;
                            }
                        }
                    }
                }
                else {
                    // check if something is accepted yet
                    var accepted;
                    for (i = 0; i < vm.week[day].length; ++i) {
                        if (vm.week[day][i].type === 'accepted') {
                            accepted = i;
                            break;
                        }
                    }
                    if (accepted >= 0) { // mark everything between accepted and this as selected
                        if (accepted < time) {
                            for (i = accepted; i <= time; ++i) {
                                vm.week[day][i].type = 'selected';
                            }
                        } else {
                            for (i = time; i <= accepted; ++i) {
                                vm.week[day][i].type = 'selected';
                            }
                        }
                    } else {
                        vm.week[day][time].type = 'accepted'; // mark beginning
                    }
                }
                // if (vm.editingMultipleRooms) {
                //     vm.room = vm.rooms[0];
                // }

                updateWorkingHours();
            };

            $scope.$on('$localeChangeSuccess', function () {
                vm.weekdayNames = DateTime.getWeekdayNames();
            });

            function updateWorkingHours() {
                var data = {};
                var workingHours = [];
                for (var day in vm.week) {
                    if (vm.week.hasOwnProperty(day)) {
                        var blocks = blocksForDay(day);
                        var weekdayBlocks = {'weekday': day, 'blocks': []};
                        for (var i = 0; i < blocks.length; ++i) {
                            var block = blocks[i];
                            var start = formatTime(vm.times[block[0]] || "0:00");
                            var end = formatTime(vm.times[block[block.length - 1] + 1]);
                            weekdayBlocks.blocks.push({'start': start, 'end': end});
                        }
                        workingHours.push(weekdayBlocks);
                    }
                }
                data.workingHours = workingHours;
                var roomIds;
                if (vm.editingMultipleRooms) {
                    roomIds = vm.rooms.map(function (s) {
                        return s.id;
                    });
                } else {
                    roomIds = [vm.room.id];
                }
                data.roomIds = roomIds;
                Room.workingHours.update(data,
                    function () {
                        toast.info($translate.instant('sitnet_default_opening_hours_updated'));
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );
            }

            function blocksForDay(day) {
                var blocks = [];
                var tmp = [];
                for (var i = 0; i < vm.week[day].length; ++i) {
                    if (vm.week[day][i].type) {
                        tmp.push(i);
                        if (i === vm.week[day].length - 1) {
                            blocks.push(tmp);
                            tmp = [];
                        }
                    } else if (tmp.length > 0) {
                        blocks.push(tmp);
                        tmp = [];
                    }
                }
                return blocks;
            }

            function formatTime(time) {
                var hours = moment().isDST() ? 1 : 0;
                return moment()
                    .set('hour', parseInt(time.split(':')[0]) + hours)
                    .set('minute', time.split(':')[1])
                    .format("DD.MM.YYYY HH:mmZZ");
            }

            function setSelected(day, slots) {
                for (var i = 0; i < slots.length; ++i) {
                    if (vm.week[day][slots[i]]) {
                        vm.week[day][slots[i]].type = 'selected';
                    }
                }
            }

            function slotToTimes(slot) {
                var arr = [];
                var startKey = moment(slot.startTime).format("H:mm");
                var endKey = moment(slot.endTime).format("H:mm");
                var start = startKey === '0:00' ? 0 : vm.times.indexOf(startKey);
                for (var i = start; i < vm.times.length; i++) {
                    if (vm.times[i] === endKey) {
                        break;
                    }
                    arr.push(i);
                }
                return arr;
            }
        }]
    });