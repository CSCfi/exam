(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('QuestionOwnerController', ['$scope', '$uibModalInstance', 'question', 'sessionService', '$translate',
            'QuestionRes', 'UserRes', 'limitToFilter',
            function ($scope, $modalInstance, question, sessionService, $translate, QuestionRes, UserRes, limitToFilter) {

                $scope.user = sessionService.getUser();
                $scope.question = question;

                $scope.newOwner = { id: null, name: null };

                $scope.questionOwners = function (filter, criteria) {
                    return UserRes.filterOwnersByQuestion.query({
                        role: 'TEACHER',
                        qid: $scope.question.id,
                        q: criteria
                    }).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.setQuestionOwner = function ($item, $model, $label) {
                    $scope.newOwner.id = $item.id;
                };

                // Cancel button is pressed in the modal dialog
                $scope.cancel = function () {
                    $modalInstance.dismiss('Canceled');
                };

                // Ok button is pressed in the modal dialog
                $scope.ok = function (data) {
                    $modalInstance.close(data);
                };

                $scope.addQuestionOwner = function () {
                    if ($scope.newOwner.id) {
                        QuestionRes.questionOwner.update({
                            uid: $scope.newOwner.id,
                            questionIds: $scope.question.id
                        }, function (owner) {
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
