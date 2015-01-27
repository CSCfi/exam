(function () {
    'use strict';
    angular.module('sitnet.services')
        .factory('sessionService', function () {
            var sessionUser = {};

            var login = function(/*params*/) {
                 return sessionUser;
            };

            var logout = function(/*params*/) {

            };

            var switchLanguage = function (key) {
                $translate.uses(key);
            };


            var logoutDialog = function () {

                var modalInstance = $modal.open({
                    templateUrl: 'assets/templates/logout/dialog_logout.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: "ModalInstanceCtrl"
                });

                modalInstance.result.then(function () {
                    // OK button
                    dologout();
                }, function () {
                    // Cancel button
                });
            };


            return {
                login: login,
                logout: logout,
                getUser: sessionUser,
                logoutDialog: logoutDialog,
                switchLanguage: switchLanguage
            };

        });
}());
