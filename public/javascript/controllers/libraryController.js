(function () {
    'use strict'
    angular.module("sitnet.controllers")
        .controller('LibraryCtrl', ['$scope', 'QuestionRes', '$translate', '$location', function ($scope, QuestionRes, $translate, $location) {

            var questions = QuestionRes.query(function () {
                questions.map(function (item) {
                    var icon = "";
                    switch (item.type) {
                        case "MULTIPLE_CHOICE_ONE_CORRECT":
                        case "MULTIPLE_CHOICE_SEVERAL_CORRECT":
                            icon = "fa-list-ol";
                            break;
                        case "ESSAY":
                            icon = "fa-edit";
                        default:
                            ""
                            icon = "fa-edit";
                    }
                    item.icon = icon;
                });
                $scope.questions = questions;
            });

            $scope.contentTypes = ["aineistotyypit", "haettava", "kannasta", "Kaikki aineistotyypit - oletus"];
            $scope.libraryFilter = "";

            $scope.selected = undefined;
        }]);
})();