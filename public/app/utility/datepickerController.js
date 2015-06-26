(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DatepickerCtrl', ['$scope', '$locale', 'dateService', 'datepickerPopupConfig',
            function ($scope, $locale, dateService, datepickerPopupConfig) {

                $scope.dateService = dateService;

                $scope.today = function () {
                    $scope.dateService.startDate = new Date();
                    $scope.dateService.exceptionStartDate = new Date();
                    $scope.dateService.endDate = new Date();
                    $scope.dateService.exceptionEndDate = new Date();
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

                $scope.clear = function () {
                    $scope.dateService.startDate = null;
                    $scope.dateService.exceptionStartDate = null;
                    $scope.dateService.endDate = null;
                    $scope.dateService.exceptionEndDate = null;
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
                    var d = new Date(v);
                    var curr_date = d.getDate();
                    var curr_month = d.getMonth() + 1; //Months are zero based
                    var curr_year = d.getFullYear();
                    $scope.dateService.modStartDate = curr_date + "-" + curr_month + "-" + curr_year;
                    $scope.dateService.startTimestamp = d.getTime();
                });

                $scope.$watch('dateService.endDate', function (v) {
                    var d = new Date(v);
                    var curr_date = d.getDate();
                    var curr_month = d.getMonth() + 1; //Months are zero based
                    var curr_year = d.getFullYear();
                    $scope.dateService.modEndDate = curr_date + "-" + curr_month + "-" + curr_year;
                    $scope.dateService.endTimestamp = d.getTime();
                });
                $scope.$watch('dateService.exceptionStartDate', function (v) {
                    var d = new Date(v);
                    var curr_date = d.getDate();
                    var curr_month = d.getMonth() + 1; //Months are zero based
                    var curr_year = d.getFullYear();
                    $scope.dateService.modStartDate = curr_date + "-" + curr_month + "-" + curr_year;
                    $scope.dateService.exceptionStartDateTimestamp = d.getTime();
                });

                $scope.$watch('dateService.exceptionEndDate', function (v) {
                    var d = new Date(v);
                    var curr_date = d.getDate();
                    var curr_month = d.getMonth() + 1; //Months are zero based
                    var curr_year = d.getFullYear();
                    $scope.dateService.modEndDate = curr_date + "-" + curr_month + "-" + curr_year;
                    $scope.dateService.exceptionEndDateTimestamp = d.getTime();
                });

                $scope.dateOptions = {
                    'starting-day': 1
                };

                $scope.formats = ['dd.MM.yyyy', 'yyyy/MM/dd', 'shortDate'];
                $scope.format = $scope.formats[0];

            }])
}());
