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

            return {
                createQuestion: createQuestion
            };

        }]);
}());
