(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TestCtrl', ['$scope', '$http', function ($scope, $http) {
            var xhr = $http.get('ping');
            xhr.success(function (reply) {
                $scope.reply = reply;
            });
            xhr.error(function (reply) {
                $scope.reply = reply;
            });
        }]);
}());