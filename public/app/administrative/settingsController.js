(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('SettingsController', ['$scope', '$translate', '$location', '$http', 'SettingsResource', 'sessionService',
            function ($scope, $translate, $location, $http, SettingsResource, sessionService) {

                var user = sessionService.getUser();
                if (!user || !user.isAdmin) {
                    $location.path("/");
                }

                $scope.eula = SettingsResource.agreement.get();
                SettingsResource.deadline.get(function (deadline) {
                    deadline.value = parseInt(deadline.value);
                    $scope.deadline = deadline;
                });

                SettingsResource.reservationWindow.get(function (window) {
                    window.value = parseInt(window.value);
                    $scope.reservationWindow = window;
                });

                $scope.updateAgreement = function () {

                    SettingsResource.agreement.update($scope.eula,
                        function () {
                            toastr.info($translate.instant("sitnet_user_agreement") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.updateDeadline = function () {

                    SettingsResource.deadline.update($scope.deadline,
                        function () {
                            toastr.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.updateReservationWindow = function () {

                    SettingsResource.reservationWindow.update($scope.reservationWindow,
                        function () {
                            toastr.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.showAttributes = function () {
                    $http.get('/attributes').success(function (attributes) {
                        $scope.attributes = attributes;
                    });
                };
            }]);
}());
