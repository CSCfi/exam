/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.facility.rooms')
    .service('Room', ['$resource', '$translate', '$route', 'dialogs', 'toast', '$q', '$uibModal',
        function ($resource, $translate, $route, dialogs, toast, $q, $modal) {

        var self = this;

        var week = {
            'MONDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'TUESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'WEDNESDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'THURSDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'FRIDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'SATURDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            }),
            'SUNDAY': Array.apply(null, new Array(48)).map(function (x, i) {
                return {'index': i, type: ''};
            })
        };

        var times = ['']; // This is a dummy value for setting something for the table header

        for (var i = 0; i <= 24; ++i) {
            if (i > 0) {
                times.push(i + ':00');
            }
            if (i < 24) {
                times.push(i + ':30');
            }
        }

        self.rooms = $resource("/app/rooms/:id",
            {
                id: "@id"
            },
            {
                "update": {method: "PUT"},
                "inactivate": {method: "DELETE"},
                "activate": {method: "POST"}
            });

        self.addresses = $resource("/app/address/:id",
            {
                id: "@id"
            },
            {
                "update": {method: "PUT"}
            });

        self.workingHours = $resource("/app/workinghours/", null,
            {
                "update": {method: "PUT"}
            });
        self.examStartingHours = $resource("/app/startinghours/", null,
            {
                "update": {method: "PUT"}
            }
        );
        self.exceptions = $resource("/app/exception",
            {},
            {
                "update": {method: "PUT"}
            });

        self.exception = $resource("/app/rooms/:roomId/exception/:exceptionId",
            {
                roomId: "@roomId",
                exceptionId: "@exceptionId"
            },
            {
                "remove": {method: "DELETE"}
            });

        self.draft = $resource("/app/draft/rooms");

        self.isAnyExamMachines = function (room) {
            return room.examMachines && room.examMachines.length > 0;
        };

        self.isSomethingSelected = function (week) {
            for (var day in week) {
                if (week.hasOwnProperty(day)) {
                    if (!self.isEmpty(week, day)) {
                        return true;
                    }
                }
            }
            return false;
        };

        self.isEmpty = function (week, day) {
            for (var i = 0; i < week[day].length; ++i) {
                if (week[day][i].type !== '') {
                    return false;
                }
            }
            return true;
        };

        self.getTimes = function () {
            return angular.copy(times);
        };

        self.getWeek = function () {
            return angular.copy(week);
        };

        self.disableRoom = function (room) {
            var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_room_inactivation'));
            dialog.result.then(function () {
                self.rooms.inactivate({id: room.id},
                    function () {
                        toast.info($translate.instant('sitnet_room_inactivated'));
                        $route.reload();
                    },
                    function (error) {
                        toast.error(error.data);
                    }
                );
            });
        };

        self.enableRoom = function (room) {
            self.rooms.activate({id: room.id},
                function () {
                    toast.info($translate.instant('sitnet_room_activated'));
                    $route.reload();
                },
                function (error) {
                    toast.error(error.data);
                }
            );

        };

        self.addException = function (ids, exception) {
            var d = $q.defer();
            self.exceptions.update({roomIds: ids, exception: exception},
                function (data) {
                    toast.info($translate.instant('sitnet_exception_time_added'));
                    d.resolve(data);
                },
                function (error) {
                    toast.error(error.data);
                    d.reject();
                }
            );
            return d.promise;
        };

        self.openExceptionDialog = function (callBack) {
            var modalInstance = $modal.open({
                component: 'exception',
                backdrop: 'static',
                keyboard: true
            });
            modalInstance.result.then(function (exception) {
                callBack({exception: exception});
            });
        };

        self.deleteException = function (roomId, exceptionId) {
            var d = $q.defer();
            self.exception.remove({roomId: roomId, exceptionId: exceptionId},
                function () {
                    toast.info($translate.instant('sitnet_exception_time_removed'));
                    d.resolve();
                },
                function (error) {
                    toast.error(error.data);
                    d.reject();
                }
            );
            return d.promise;
        };

        self.formatExceptionEvent = function(event) {
                event.startDate = moment(event.startDate).format();
                event.endDate = moment(event.endDate).format();
        };

        self.updateStartingHours = function (hours, offset, roomIds) {
            var d = $q.defer();
            var selected = hours.filter(function (hour) {
                return hour.selected;
            }).map(function (hour) {
                return formatTime(hour.startingHour);
            });
            var data = {hours: selected, offset: offset};
            data.roomIds = roomIds;

            self.examStartingHours.update(data,
                function () {
                    toast.info($translate.instant('sitnet_exam_starting_hours_updated'));
                    d.resolve();
                },
                function (error) {
                    toast.error(error.data);
                    d.reject();
                }
            );
            return d.promise;
        };

        self.updateWorkingHours = function (week, ids) {
            var data = {};
            var workingHours = [];
            var times = self.getTimes();
            for (var day in week) {
                if (week.hasOwnProperty(day)) {
                    var blocks = blocksForDay(week, day);
                    var weekdayBlocks = {'weekday': day, 'blocks': []};
                    for (var i = 0; i < blocks.length; ++i) {
                        var block = blocks[i];
                        var start = formatTime(times[block[0]] || "0:00");
                        var end = formatTime(times[block[block.length - 1] + 1]);
                        weekdayBlocks.blocks.push({'start': start, 'end': end});
                    }
                    workingHours.push(weekdayBlocks);
                }
            }
            data.workingHours = workingHours;
            data.roomIds = ids;
            self.workingHours.update(data,
                function () {
                    toast.info($translate.instant('sitnet_default_opening_hours_updated'));
                },
                function (error) {
                    toast.error(error.data);
                }
            );
        };

        function blocksForDay(week, day) {
            var blocks = [];
            var tmp = [];
            for (var i = 0; i < week[day].length; ++i) {
                if (week[day][i].type) {
                    tmp.push(i);
                    if (i === week[day].length - 1) {
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

    }]);
