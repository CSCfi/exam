'use strict';
angular.module('app.exam.editor')
    .service('QuestionReview', ['$resource',
        function ($resource) {

            var self = this;

            self.questionsApi = $resource('/app/exam/:id/questions', {
                id: '@id'
            });

        }]);
