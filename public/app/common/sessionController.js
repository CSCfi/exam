(function () {
    // This is the controller for logging out and logging in if using dev type login. Haka initiated login is initiated
    // automatically by the run block in sitnet.js
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$rootScope', '$location', '$modal', '$translate', 'sessionService', 'UserRes', 'SITNET_CONF',
            function ($scope, $rootScope, $location, $modal, $translate, sessionService, UserRes, SITNET_CONF) {

                $scope.credentials = {};

                $scope.logout = function () {
                    sessionService.logout().then(function () {
                        delete $scope.user;
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate("sitnet_logout_success"));
                    });
                };

                if ($location.url() == "/logout" && sessionService.getUser()) {
                    $scope.logout();
                }

                $scope.switchLanguage = function (key) {
                    sessionService.switchLanguage(key);
                };

                $scope.login = function () {
                    sessionService.login($scope.credentials.username, $scope.credentials.password).then(function () {

                        var user = sessionService.getUser();
                        $rootScope.$broadcast('userUpdated');

                        var welcome = function () {
                            toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                        };
                        setTimeout(welcome, 2000);

                        if (user.isStudent && !user.hasAcceptedUserAgreament) {

                            $modal.open({

                                templateUrl: SITNET_CONF.TEMPLATES_PATH + 'common/show_eula.html',
                                backdrop: 'static',
                                keyboard: false,
                                controller: function ($scope, $modalInstance, sessionService) {

                                    $scope.ok = function () {
                                        // OK button
                                        UserRes.updateAgreementAccepted.update({id: user.id}, function (user) {
                                            sessionService.setUser(user);
                                        }, function (error) {
                                            toastr.error(error.data);
                                        });
                                        $modalInstance.dismiss();
                                        if ($location.url() === '/login'|| $location.url() === '/logout') {
                                            $location.path("/home");
                                        }
                                    };
                                    $scope.cancel = function () {
                                        $modalInstance.dismiss('cancel');
                                        $location.path("/logout");
                                    };
                                }
                            });
                        } else if ($location.url() === '/login' || $location.url() === '/logout') {
                            $location.path("/home");
                        }
                    }, function (message) {
                        if ($location.url() === '/login' || $location.url() === '/logout') {
                            $location.path("/logout");
                            toastr.error(message);
                        }
                    });
                };
            }
        ]);
}());