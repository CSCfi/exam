(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LibraryCtrl', ['$scope', '$sce', 'QuestionRes', '$translate', function ($scope, $sce, QuestionRes, $translate) {

            var randomQuestions = function (questions) {
                var result = [];
                var randomQuestions = [];
                angular.extend(randomQuestions, questions);
                var shuffle = function () {
                    randomQuestions.sort(function () {
                        return 0.5 - Math.random();
                    });
                };
                shuffle();
                var limit = function (desiredAmount) {
                    var amount = desiredAmount || 1;

                    if (amount >= randomQuestions.length) {
                        toastr.warning($translate("sitnet_answer_amount_too_great") + amount + " (" + randomQuestions.length + ")");
                        return randomQuestions;
                    }
                    result.length = 0;
                    result.push.apply(result, randomQuestions.slice(0, amount));
//                    console.log(result);
                    shuffle();
                    return result;

                };
                return {
                    limit: limit,
                    shuffle: shuffle
                };
            };

            QuestionRes.query(function (data) {
                data.map(function (item) {
                    var icon = "";
                    switch (item.type) {
                    case "MultipleChoiceQuestion":
                        icon = "fa-list-ol";
                        break;
                    case "EssayQuestion":
                        icon = "fa-edit";
                        break;
                    default:
                        icon = "fa-edit";
                        break;
                    }
                    item.icon = icon;
                    return item;
                });
                $scope.questions = data;
                $scope.random = randomQuestions(data).limit;
            });

            $scope.contentTypes = ["aineistotyypit", "haettava", "kannasta", "Kaikki aineistotyypit - oletus"];
            $scope.libraryFilter = "";

            $scope.selected = undefined;

        }]);
}());