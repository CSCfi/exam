(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$rootScope', '$localStorage', '$location', '$modal', '$translate', 'sessionService', 'UserRes', 'SITNET_CONF', 'tmhDynamicLocale',
            function ($scope, $rootScope, $localStorage, $location, $modal, $translate, sessionService, UserRes, SITNET_CONF, tmhDynamicLocale) {

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
                    $translate.uses(key);
                    tmhDynamicLocale.set(key);
                };

                $scope.login = function () {
                    sessionService.login($scope.credentials.username, $scope.credentials.password).then(function () {
                        var user = sessionService.getUser();
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);

                        if (user.isStudent && !user.hasAcceptedUserAgreament) {

                            $modal.open({

                                templateUrl: 'assets/templates/dialogs/show_eula.html',
                                backdrop: 'static',
                                keyboard: false,
                                controller: function ($scope, $modalInstance, sessionService) {

                                    $scope.ok = function () {
                                        console.log("ok")
                                        // OK button
                                        UserRes.updateAgreementAccepted.update({id: user.id}, function (user) {
                                            sessionService.setUser(user);
                                        }, function (error) {
                                            toastr.error(error.data);
                                        });
                                        $modalInstance.dismiss();
                                        if ($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                                            $location.path($localStorage["LOCATION.PATH"]);
                                            $localStorage["LOCATION.PATH"] = "";
                                        } else {
                                            $location.path("/home");
                                        }
                                    };
                                    $scope.cancel = function () {
                                        $modalInstance.dismiss('cancel');
                                        $location.path("/logout");
                                    };
                                }
                            });
                        } else { // We might want to somehow redirect user to provided URL path here
                            $location.path("/home");
                        }
                    }, function (message) {
                        toastr.error(message);
                        $location.path("/login");
                    });
                };

            }
        ]);
}());