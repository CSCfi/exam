(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ModalInstanceCtrl', ['$scope', '$modalInstance',
            function ($scope, $modalInstance) {

                $scope.ok = function () {
                    $modalInstance.close("Accepted");
                };

                $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                };
            }]);
}());
