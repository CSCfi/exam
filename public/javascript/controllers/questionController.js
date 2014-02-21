(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionCtrl', ['$scope', 'QuestionRes', function ($scope, QuestionRes) {

            $scope.questions = QuestionRes.query();

            $scope.toggleSection = function (section) {
                console.log(section);
            };

            $scope.editSection = function (section) {
                console.log(section);
            };
        }]);
})();