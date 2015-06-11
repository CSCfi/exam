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

            return {
                createQuestion: createQuestion,
                truncate: truncate
            };

        }]);
}());
