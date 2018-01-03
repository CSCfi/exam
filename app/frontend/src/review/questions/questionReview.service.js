/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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

            self.isAssessed = function (answer) {
                return answer.selected && answer.essayAnswer && parseFloat(answer.essayAnswer.score) >= 0;
            };

            self.isEvaluated = function (answer) {
                return answer.selected && answer.essayAnswer && parseFloat(answer.essayAnswer.evaluatedScore) >= 0;
            };


            self.getAssessedAnswerCount = function (review) {
                if (!review) {
                    return 0;
                }
                return review.answers.filter(function (a) {
                    return a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0; //TODO: check this
                }).length;
            };

        }]);
