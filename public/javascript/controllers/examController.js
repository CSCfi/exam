(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$http', '$modal', function ($scope, $http, $modal) {
            $scope.dialog;
            $scope.openCreateExamDialog = function () {
                $scope.dialog = $modal.open({
                    templateUrl: 'assets/templates/create_exam_form.html',
                    backdrop: 'static',
                    controller: "ExamCtrl",
                    resolve : $scope.dialog
                });
            };

            $scope.createExam = function () {
                if($scope.dialog) {
                    $scope.dialog.close();
                }
                //todo tee datalla jotain
            }


        }]);
})();