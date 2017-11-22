'use strict';
angular.module('app.facility.schedule')
    .component('exceptionList', {
        templateUrl: '/assets/app/facility/schedule/exceptionList.template.html',
        bindings: {
            room: '<'
        },
        controller: ['Room', 'toast', 'EXAM_CONF', '$translate', '$uibModal',
            function (Room, toast, EXAM_CONF, $translate, $modal) {

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

                    var modalInstance = $modal.open({
                        component: 'exception',
                        backdrop: 'static',
                        keyboard: true
                    });

                    modalInstance.result.then(function (exception) {

                        var roomIds;
                        if (vm.editingMultipleRooms) {
                            roomIds = vm.rooms.map(function (s) {
                                return s.id;
                            });
                        } else {
                            roomIds = [vm.room.id];
                        }

                        Room.exceptions.update({roomIds: roomIds, exception: exception},
                            function (data) {
                                toast.info($translate.instant('sitnet_exception_time_added'));
                                if (vm.editingMultipleRooms) {
                                    vm.getMassEditedRooms();
                                } else {
                                    Room.formatExceptionEvent(data);
                                    vm.room.calendarExceptionEvents.push(data);
                                }
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    });
                };

                vm.deleteException = function (exception) {
                    Room.exception.remove({roomId: vm.room.id, exceptionId: exception.id},
                        function () {
                            remove(vm.room.calendarExceptionEvents, exception);
                            toast.info($translate.instant('sitnet_exception_time_removed'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                function remove(arr, item) {
                    var index = arr.indexOf(item);
                    arr.splice(index, 1);
                }
            }]
    });