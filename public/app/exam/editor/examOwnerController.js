(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamOwnerController', ['$scope', '$uibModalInstance', 'exam', 'sessionService', '$routeParams', '$translate', '$http', '$location', 'EXAM_CONF','ExamRes', 'UserRes', 'limitToFilter',
            function ($scope, $modalInstance, exam, sessionService, $routeParams, $translate, $http, $location, EXAM_CONF, ExamRes, UserRes, limitToFilter) {

                $scope.user = sessionService.getUser();
                $scope.exam = exam;

                $scope.newOwner = {
                    "user": {
                        "id": null,
                        "name": null
                    },
                    "exam": {
                        "id": $scope.exam.id
                    }
                };

                $scope.examOwners = function (filter, criteria) {
                    return UserRes.filterOwnersByExam.query({role: 'TEACHER', eid: $scope.exam.id, q: criteria}).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.setExamOwner = function ($item, $model, $label) {
                    $scope.newOwner.user.id = $item.id;
                };

                // Cancel button is pressed in the modal dialog
                $scope.cancel = function () {
                    $modalInstance.dismiss('Canceled');
                };

                // Ok button is pressed in the modal dialog
                $scope.ok = function (data) {
                    $modalInstance.close(data);
                };

                $scope.addExamOwner = function () {
                    if($scope.newOwner.user.id && $scope.newOwner.user.id > 0 && $scope.newOwner.exam.id && $scope.newOwner.exam.id > 0) {
                        ExamRes.examowner.insert({eid: $scope.newOwner.exam.id, uid: $scope.newOwner.user.id}, $scope.newOwner, function (owner) {
                            toastr.info($translate.instant("sitnet_exam_saved"));
                            $scope.ok(owner);
                        }, function (error) {
                            toastr.error(error.data);
                            $scope.cancel();
                        });
                    } else {
                        toastr.error($translate.instant('sitnet_teacher_not_found'));
                        $scope.cancel();
                    }
                };

            }]);
}());
