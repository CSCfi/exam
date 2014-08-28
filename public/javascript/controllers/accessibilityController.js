(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('AccessibilityCtrl', ['$scope', '$http', function ($scope, $http) {
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
                    $scope.accessibilities.push(accessibility);
                });
            };

            $scope.remove = function(accessibility) {
                $http.delete('accessibility/' + accessibility.id).success(function(reply){
                    $scope.accessibilities = $scope.accessibilities.filter(function(item) {
                        return item.id !== accessibility.id;
                    });
                });
            };
        }]);
}());