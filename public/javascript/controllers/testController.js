(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TestCtrl', ['$scope', '$http', function ($scope, $http) {
            $http.get('ping')
                .success(function (reply) {
                    $scope.reply = reply;
                })
                .error(function (reply) {
                    $scope.reply = reply;
                });
        }]);
})();