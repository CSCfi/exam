(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DatepickerCtrl', ['$scope', '$locale', 'dateService',
            function ($scope, $locale, dateService) {

                $scope.dateService = dateService;

                $scope.today = function () {
                    $scope.dateService.startDate = new Date();
                    $scope.dateService.endDate = new Date();
                };

                // may not work with multiple inputs on same page
                $scope.modifyDay = function(type, days) {
                    if(days !== 0) {
                        var now = moment();
                        if (days < 0) {
                            now = now.subtract(days * (-1), 'days');
                        } else {
                            now = now.add(days, 'days');
                        }

                        if(type === 'start') {
                            $scope.dateService.startDate = new Date(now);
                        } else if(type === 'end') {
                            $scope.dateService.endDate = new Date(now);
                        }
                    }
                };

                $scope.today();
                $scope.showWeeks = true;
                $scope.toggleWeeks = function () {
                    $scope.showWeeks = !$scope.showWeeks;
                };

                // Disable weekend selection
                $scope.disabled = function (date, mode) {
                    return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
                };

                $scope.toggleMin = function () {
                    $scope.minDate = ( $scope.minDate ) ? null : new Date();
                };
                $scope.toggleMin();

                $scope.openStartDate = function ($event) {

                    $event.preventDefault();
                    $event.stopPropagation();

                    $scope.startDateOpened = true;
                    $scope.minDate--;
                };

                $scope.openEndDate = function ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();

                    $scope.endDateOpened = true;
                    $scope.minDate++;

                };

                $scope.$watch('dateService.startDate', function (v) {
                    $scope.dateService.startTimestamp = new Date(v).getTime();
                });

                $scope.$watch('dateService.endDate', function (v) {
                    $scope.dateService.endTimestamp = new Date(v).getTime();
                });

                $scope.dateOptions = {
                    startingDay: 1
                };

                $scope.format = 'dd.MM.yyyy';

            }]);
}());
