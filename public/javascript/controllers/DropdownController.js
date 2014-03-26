(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DropdownCtrl', ['$scope', '$http', '$location', function ($scope, $http, $location) {
            $scope.items = [
                { name: "Kieliasetukset", link: "#/user" },
                { name: "Kirjaudu ulos", link: "#/logout" }
            ];
        }]);
}());