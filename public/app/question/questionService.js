(function () {
    'use strict';
    angular.module('exam.services')
        .factory('questionService', ['$translate', '$location', 'QuestionRes', function ($translate, $location, QuestionRes) {

            var createQuestion = function (type) {
                QuestionRes.questions.create({type: type},
                    function (response) {
                        toastr.info($translate.instant('sitnet_question_added'));
                        $location.path("/questions/" + response.id);
                    }
                );
            };

            var calculateMaxPoints = function (question) {
                return (question.options.filter(function (option) {
                    return option.score > 0;
                }).reduce(function (a, b) {
                    return a + b.score;
                }, 0));
            };

            var decodeHtml = function (html) {
                var txt = document.createElement("textarea");
                txt.innerHTML = html;
                return txt.value;
            };

            var longTextIfNotMath = function (text) {
                if (text && text.length > 0 && text.indexOf("math-tex") === -1) {
                    // remove HTML tags
                    var str = String(text).replace(/<[^>]+>/gm, '');
                    // shorten string
                    return decodeHtml(str);
                }
                return "";
            };

            var shortText = function (text, maxLength) {

                if (text && text.length > 0 && text.indexOf("math-tex") === -1) {
                    // remove HTML tags
                    var str = String(text).replace(/<[^>]+>/gm, '');
                    // shorten string
                    str = decodeHtml(str);
                    return str.length + 3 > maxLength ? str.substr(0, maxLength) + "..." : str;
                }
                return text ? decodeHtml(text) : "";
            };

            var _filter;

            var setFilter = function (filter) {
                switch (filter) {
                    case "MultipleChoiceQuestion":
                    case "WeightedMultipleChoiceQuestion":
                    case "EssayQuestion":
                        _filter = filter;
                        break;
                    default:
                        _filter = undefined;
                }
            };

            var applyFilter = function(questions) {
                if (!_filter) {
                    return questions;
                }
                return questions.filter(function(q) {
                   return q.type === _filter;
                });
            };

            return {
                createQuestion: createQuestion,
                calculateMaxPoints: calculateMaxPoints,
                decodeHtml: decodeHtml,
                longTextIfNotMath: longTextIfNotMath,
                shortText: shortText,
                setFilter: setFilter,
                applyFilter: applyFilter
            };

        }]);
}());
