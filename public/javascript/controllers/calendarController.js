(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CalendarCtrl', ['$scope', function ($scope) {

            $scope.eventSources =  [];
            $scope.allEvents =  [];

            $scope.uiConfig = {
                calendar:{
                    height: 400,
                    editable: true,
                    header:{
                        left: 'month basicWeek basicDay agendaWeek agendaDay',
                        center: 'title',
                        right: 'today prev,next'
                    },
                    dayClick: $scope.alertEventOnClick,
                    eventDrop: $scope.alertOnDrop,
                    eventResize: $scope.alertOnResize
                }
            };
        }]);
}());