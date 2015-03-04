(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('DropdownCtrl', ['$scope', '$http', '$location', '$translate', 'SITNET_CONF', function ($scope, $http, $location, $translate, SITNET_CONF) {

            // Todo: Miksei toimi?
            var language = $translate("sitnet_user_language_change");
            var logout = $translate("sitnet_logout");

            $scope.handleClick = function(location, event) {
//                var xhr = $http.post('/logout');
                if (event) {
                    event();
                }
                $location.path(location);
            };

            $scope.items = [
                { name: "Kirjaudu ulos", link: "/logout", action: function() {console.log("aaaa")} }
            ];

        }]);
}());