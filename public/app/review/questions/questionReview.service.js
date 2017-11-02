'use strict';
angular.module('app.exam.editor')
    .service('QuestionReview', ['$resource',
        function ($resource) {

            var self = this;

            self.questionsApi = $resource('/app/exam/:id/questions', {
                id: '@id'
            });

            self.isFinalized = function (review) {
                return !review ? false : review.answers.length === self.getAssessedAnswerCount(review);
            };

            self.getAssessedAnswerCount = function (review) {
                if (!review) {
                    return 0;
                }
                return review.answers.filter(function (a) {
                    return a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0;
                }).length;
            };

        }]);
