(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamEnrolmentController', ['$scope', 'exam', '$uibModalInstance', '$translate', 'enrolmentService', 'UserRes', 'limitToFilter',
            function ($scope, exam, $modalInstance, $translate, enrolmentService, UserRes, limitToFilter) {

                $scope.exam = exam;

                $scope.newEnrolment = {
                    "user": {
                        "id": null,
                        "name": null
                    },
                    "exam": {
                        "id": exam.id
                    }
                };

                $scope.students = function (filter, criteria) {
                    return UserRes.unenrolledStudents.query({eid: $scope.exam.id, q: criteria}).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.setNewEnrolment = function (item) {
                    $scope.newEnrolment.user.id = item.id;
                };

                // Cancel button is pressed in the modal dialog
                $scope.cancel = function () {
                    $modalInstance.dismiss('Canceled');
                };

                // Ok button is pressed in the modal dialog
                $scope.ok = function (data) {
                    $modalInstance.close(data);
                };

                $scope.addEnrolment = function () {
                    if ($scope.newEnrolment.user.id) {
                        enrolmentService.enrollStudent($scope.exam, $scope.newEnrolment.user).then(
                            function (enrolment) {
                                toastr.info($translate.instant("sitnet_exam_saved"));
                                $scope.ok(enrolment);
                            }, function (error) {
                                toastr.error(error.data);
                                $scope.cancel();
                            });
                    }
                };

            }]);
}());
