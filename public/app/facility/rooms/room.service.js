'use strict';
angular.module('app.facility.rooms')
    .service('Room', ['$resource', '$translate', '$route', 'dialogs', 'toast',
        function ($resource, $translate, $route, dialogs, toast) {

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

    }]);
