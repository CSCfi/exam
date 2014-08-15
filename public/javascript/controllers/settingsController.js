(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SettingsController', ['$scope', '$translate', '$location', '$http', 'SettingsResource',
            function ($scope, $translate, $location, $http, SettingsResource) {

                $scope.settings = SettingsResource.settings.query();



                $scope.updateSettings = function (settings) {

                    SettingsResource.settings.update({id: settings.id}, settings,
                        function (responce) {
                            toastr.info($translate("sitnet_user_agreament") +" "+ $translate("sitnet_updated"));
                            $scope.settings = responce;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };




            }]);
}());