(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamLogoutCtrl', ['$scope', '$rootScope', '$timeout', '$translate', '$routeParams', '$location',
            function ($scope, $rootScope, $timeout, $translate, $routeParams, $location) {

                $scope.reasonPhrase = $routeParams.reason === 'aborted' ? 'sitnet_exam_aborted' : 'sitnet_exam_returned';

                $timeout(function () {
                    $rootScope.$broadcast("examEnded");
                    $location.path("/logout");
                }, 8000);

            }]);
}());
