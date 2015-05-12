(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AccessibilityCtrl', ['$scope', '$translate', '$http', function ($scope, $translate, $http) {
            $scope.accessibilities = [];

            $http.get('accessibility').success(function(data){
                $scope.accessibilities = data;
            });

            $scope.add = function(name, id) {
                var accessibility = {
                    name: name
                };

                if(id) {
                    accessibility.id = id;
                }

                $http.post('accessibility', accessibility).success(function(reply) {
                    $http.get('accessibility').success(function(data){
                        $scope.accessibilities = data;
                    });
                    toastr.info($translate("sitnet_accessibility_added"));
                });
            };

            $scope.update = function (accessibility) {
                $http.put('accessibility', accessibility).success(function(reply) {
                    accessibility = reply;
                    toastr.info($translate("sitnet_accessibility_updated"));
                });
            };

            $scope.remove = function(accessibility) {
                $http.delete('accessibility/' + accessibility.id).success(function(reply){
                    $scope.accessibilities = $scope.accessibilities.filter(function(item) {
                        return item.id !== accessibility.id;
                    });
                    toastr.info($translate("sitnet_accessibility_removed"));
                });
            };
        }]);
}());