(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('SettingsController', ['$scope', '$translate', '$location', '$http', 'SettingsResource',
            function ($scope, $translate, $location, $http, SettingsResource) {

                $scope.eula = SettingsResource.agreement.get();
                SettingsResource.deadline.get(function (deadline) {
                    deadline.value = parseInt(deadline.value);
                    $scope.deadline = deadline;
                });

                $scope.updateAgreement = function () {

                    SettingsResource.agreement.update($scope.eula,
                        function () {
                            toastr.info($translate.instant("sitnet_user_agreament") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.updateDeadline = function () {

                    SettingsResource.settings.update($scope.deadline,
                        function () {
                            toastr.info($translate.instant("sitnet_settings") + " " + $translate.instant("sitnet_updated"));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.showAttributes = function () {
                    $http.get('/attributes').success(function (attributes) {
                        $scope.attributes = attributes;
                    })
                }
            }]);
}());