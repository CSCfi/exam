(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DatepickerCtrl', ['$scope',
        function ($scope) {
            $scope.today = function () {
                $scope.startDate = new Date();
                $scope.endDate = new Date();
            };
            $scope.today();

            $scope.showWeeks = true;
            $scope.toggleWeeks = function () {
                $scope.showWeeks = !$scope.showWeeks;
            };

            $scope.clear = function () {
                $scope.startDate = null;
                $scope.endDate = null;
            };

            // Disable weekend selection
            $scope.disabled = function (date, mode) {
                return ( mode === 'day' && ( date.getDay() === 0 || date.getDay() === 6 ) );
            };

            $scope.toggleMin = function () {
                $scope.minDate = ( $scope.minDate ) ? null : new Date();
            };
            $scope.toggleMin();

            $scope.open1 = function ($event) {
                $event.preventDefault();
                $event.stopPropagation();

                $scope.opened1 = true;
            };

            $scope.open2 = function ($event) {
                $event.preventDefault();
                $event.stopPropagation();

                $scope.opened2 = true;
            };

            $scope.dateOptions = {
                'year-format': "'yy'",
                'starting-day': 1
            };

            $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'shortDate'];
            $scope.format = $scope.formats[0];
        }])
}());
