(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SettingsController', ['$scope', '$translate', '$location', '$http', 'SettingsResource',
            function ($scope, $translate, $location, $http, SettingsResource) {

                $scope.settings = SettingsResource.agreement.query();

                $scope.updateAgreement = function (settings) {

                    SettingsResource.agreement.update({id: settings.id}, settings,
                        function (responce) {
                            toastr.info($translate("sitnet_user_agreament") +" "+ $translate("sitnet_updated"));
                            $scope.settings = responce;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.updateGeneralSettings = function (settings) {

                    SettingsResource.settings.update(settings,

                        function(response) {

                            toastr.info($translate("sitnet_settings") + " " + $translate("sitnet_updated"));
                                $scope.settings = response;
                            }, function (error) {
                                toastr.error(error.data);
                        });
                };

                $scope.showAttributes = function() {
                  $http.get('/attributes').success(function(attributes) {
                      $scope.attributes = attributes;
                  })
                }
            }]);
}());