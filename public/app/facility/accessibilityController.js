(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('AccessibilityCtrl', ['$scope', '$translate', '$http', function ($scope, $translate, $http) {
            $scope.accessibilities = [];

            $http.get('/app/accessibility').success(function(data){
                $scope.accessibilities = data;
            });

            $scope.add = function(name, id) {
                var accessibility = {
                    name: name
                };

                if(id) {
                    accessibility.id = id;
                }

                $http.post('/app/accessibility', accessibility).success(function(reply) {
                    $http.get('accessibility').success(function(data){
                        $scope.accessibilities = data;
                    });
                    toastr.info($translate.instant("sitnet_accessibility_added"));
                });
            };

            $scope.update = function (accessibility) {
                $http.put('/app/accessibility', accessibility).success(function(reply) {
                    accessibility = reply;
                    toastr.info($translate.instant("sitnet_accessibility_updated"));
                });
            };

            $scope.remove = function(accessibility) {
                $http.delete('/app/accessibility/' + accessibility.id).success(function(reply){
                    $scope.accessibilities = $scope.accessibilities.filter(function(item) {
                        return item.id !== accessibility.id;
                    });
                    toastr.info($translate.instant("sitnet_accessibility_removed"));
                });
            };
        }]);
}());
