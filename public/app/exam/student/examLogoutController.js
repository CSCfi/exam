(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamLogoutCtrl', ['$scope', '$timeout', '$translate', '$routeParams', '$location',
            function ($scope, $timeout, $translate, $routeParams, $location) {

                $scope.reasonPhrase = $routeParams.reason === 'aborted'
                    ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';

                $timeout(function () {
                    $location.path("/logout");
                }, 8000);

            }]);
}());