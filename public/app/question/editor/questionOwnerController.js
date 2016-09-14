(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('QuestionOwnerController', ['$scope', '$uibModalInstance', 'question', 'sessionService', '$translate',
            'QuestionRes', 'UserRes', 'limitToFilter',
            function ($scope, $modalInstance, question, sessionService, $translate, QuestionRes, UserRes, limitToFilter) {

                $scope.user = sessionService.getUser();
                $scope.question = question;

                $scope.newOwner = {id: null, name: null};

                $scope.questionOwners = function (filter, criteria) {
                    var data = {
                        role: 'TEACHER',
                        q: criteria
                    };
                    if ($scope.question.id) {
                        data.qid = $scope.question.id;
                    }
                    return UserRes.filterOwnersByQuestion.query(data).$promise.then(
                        function (names) {
                            return limitToFilter(
                                names.filter(function (n) {
                                    return $scope.question.questionOwners.map(function (qo) {
                                            return qo.id;
                                        }).indexOf(n.id) == -1;
                                }), 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.setQuestionOwner = function ($item, $model, $label) {
                    $scope.newOwner.id = $item.id;
                    $scope.newOwner.firstName = $item.firstName;
                    $scope.newOwner.lastName = $item.lastName;
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
                        $scope.ok($scope.newOwner);
                    }
                };

            }]);
}());
