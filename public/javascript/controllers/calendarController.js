(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CalendarCtrl', ['$scope', '$http', '$modal', function ($scope, $http, $modal) {

            $scope.events = [];

            var xhr = $http.get('calendar/01.01.2014');

            xhr.success(function (reply) {
                var firstDate = undefined;
                var data = reply.map(function (item) {
                    var start = moment(item.start, 'DD.MM.YYYY HH:mm').toDate();
                    var end = moment(item.end, 'DD.MM.YYYY HH:mm').toDate();
                    if (!firstDate) {
                        firstDate = start;
                    }
                    return  {title: item.title.replace(new RegExp(String.fromCharCode(160), "g"), " "), start: start, end: end, allDay: false}
                });

                $scope.events.push(data);

                if (firstDate) {
                    $scope.cal.fullCalendar('gotoDate', firstDate);
                    firstDate = undefined;
                }

            });
            xhr.error(function (reply) {
                $scope.reply = reply;
            });

            var xhr = $http.get('rooms');

            xhr.success(function (reply) {
                $scope.rooms = reply;
                $scope.room = $scope.rooms[0];
            });
            xhr.error(function (reply) {

            });

            $scope.alertEventOnClick = function (date, allDay, jsEvent, view) {
                var modalInstance = $modal.open({
                    templateUrl: 'assets/templates/calendar_reservation.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: "CalendarCtrl",
                    resolve: {
                        slot: function () {
                            return date;
                        }
                    }
                });

            };

            $scope.uiConfig = {
                calendar: {
                    editable: true,
                    header: {
                        left: 'month basicWeek basicDay agendaWeek agendaDay',
                        center: 'title',
                        right: 'today prev,next'
                    },
                    eventClick: $scope.alertEventOnClick,
                    eventDrop: $scope.alertOnDrop,
                    eventResize: $scope.alertOnResize
                }
            };
        }]);
}());