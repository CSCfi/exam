(function () {
    // This is the controller for logging out and logging in if using dev type login. Haka initiated login is initiated
    // automatically by the run block in app.js
    'use strict';
    angular.module("exam.controllers")
        .controller('SessionCtrl', ['$scope', '$location', '$translate', 'sessionService',
            function ($scope, $location, $translate, sessionService) {

                $scope.credentials = {}; // DEV-login only

                $scope.switchLanguage = function (key) {
                    sessionService.switchLanguage(key);
                };

                $scope.login = function () {
                    sessionService.login($scope.credentials.username, $scope.credentials.password);
                };

                sessionService.setLoginEnv($scope);

                if ($location.url() == "/logout") {
                    sessionService.logout();
                }

            }
        ]);
}());
