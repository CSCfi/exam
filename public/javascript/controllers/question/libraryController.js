(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LibraryCtrl', ['$scope', 'sessionService', 'QuestionRes', '$translate', function ($scope, sessionService, QuestionRes, $translate) {

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
                    shuffle();
                    return result;
                };
                return {
                    limit: limit,
                    shuffle: shuffle
                };
            };

            // FIXME: no need to provide login user here, it is known by backend anyways
            QuestionRes.questionlist.query({id: sessionService.getUser().id}, function (data) {
                data.map(function (item) {
                    var icon = "";
                    switch (item.type) {
                        case "MultipleChoiceQuestion":
                            icon = "fa-list-ul";
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

            $scope.stripHtml = function(text) {
                return String(text).replace(/<[^>]+>/gm, '');
            };

            $scope.shortText = function (text) {
                // reomve HTML tags
                var str = String(text).replace(/<[^>]+>/gm, '');

                // shorten string
                var maxLength = 40;
                if(str.length > maxLength)
                    str = String(str).substr(0, maxLength) + "...";

                return str;
            };


            $scope.contentTypes = ["aineistotyypit", "haettava", "kannasta", "Kaikki aineistotyypit - oletus"];
            $scope.libraryFilter = "";
            $scope.selected = undefined;

        }]);
}());