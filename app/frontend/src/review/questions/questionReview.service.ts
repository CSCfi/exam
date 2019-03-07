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

import * as angular from 'angular';
import { QuestionReview, ReviewQuestion } from '../review.model';

export class QuestionReviewService {

    constructor(
        private $q: angular.IQService,
        private $http: angular.IHttpService) {
        'ngInject';
    }

    questionsApi = (id: number) => `/app/exam/${id}/questions`;

    isFinalized = (review: QuestionReview) =>
        !review ? false : review.answers.length === this.getAssessedAnswerCount(review)

    isAssessed = (answer: ReviewQuestion) =>
        answer.selected && answer.essayAnswer && parseFloat(answer.essayAnswer.score) >= 0

    isEvaluated = (answer: ReviewQuestion) =>
        answer.selected && answer.essayAnswer && parseFloat(answer.essayAnswer.evaluatedScore) >= 0

    getAssessedAnswerCount = (review: QuestionReview) =>
        !review ? 0 : review.answers.filter(a => a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0).length

    getReviews(examId: number, ids = []): angular.IPromise<QuestionReview[]> {
        const deferred: angular.IDeferred<QuestionReview[]> = this.$q.defer();
        this.$http.get(`/app/exam/${examId}/questions`, { params: { ids: ids } })
            .then((resp: angular.IHttpResponse<QuestionReview[]>) => {
                deferred.resolve(resp.data);
            })
            .catch(resp => deferred.reject(resp));
        return deferred.promise;
    }

}

angular.module('app.review').service('QuestionReview', QuestionReviewService);
