'use strict';
angular.module('app.utility')
    .controller('ModalInstanceCtrl', ['$scope', '$uibModalInstance',
        function ($scope, $modalInstance) {

            // Ok button is pressed in the modal dialog
            $scope.ok = function () {
                $modalInstance.close("Accepted");
            };

            // Cancel button is pressed in the modal dialog
            $scope.cancel = function () {
                $modalInstance.dismiss('Canceled');
            };
        }]);
