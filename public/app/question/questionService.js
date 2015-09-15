/**
 * Created by mlupari on 20/03/15.
 */
(function () {
    'use strict';
    angular.module('exam.services')
        .factory('questionService', ['$translate', '$location', 'QuestionRes', function ($translate, $location, QuestionRes) {

            var createQuestion = function(type) {
                var newQuestion;
                newQuestion = {
                    type: type,
                    question: $translate.instant('sitnet_new_question_draft')
                };

                QuestionRes.questions.create(newQuestion,
                    function(response) {
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

            var truncate = function (content, offset) {
                if (content && content.indexOf("math-tex") === -1) {
                    if (offset < content.length) {
                        return content.substring(0, offset) + " ...";
                    } else {
                        return content;
                    }
                }
                return content;
            };

            var decodeHtml = function(html) {
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

            return {
                createQuestion: createQuestion,
                calculateMaxPoints: calculateMaxPoints,
                truncate: truncate,
                decodeHtml: decodeHtml,
                longTextIfNotMath: longTextIfNotMath,
                shortText: shortText
            };

        }]);
}());
