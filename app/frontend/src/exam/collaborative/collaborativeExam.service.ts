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

import * as ng from 'angular';
import * as toast from 'toastr';

export interface CollaborativeExam {
    id: number;
}

export class CollaborativeExamService {

    exams: CollaborativeExam[];

    constructor(
        private $http: ng.IHttpService,
        private $q: ng.IQService) {

        'ngInject';
    }

    listExams(): ng.IPromise<CollaborativeExam[]> {
        const deferred: ng.IDeferred<CollaborativeExam[]> = this.$q.defer();
        this.$http.get('/integration/iop/exams').then((resp: ng.IHttpResponse<CollaborativeExam[]>) => {
            deferred.resolve(resp.data);
        }, err => {
            toast.error(err.data);
            deferred.reject(err);
        });
        return deferred.promise;
    }

    createExam(): ng.IPromise<CollaborativeExam> {
        const deferred: ng.IDeferred<CollaborativeExam> = this.$q.defer();
        this.$http.post('/integration/iop/exams', {}).then((resp: ng.IHttpResponse<CollaborativeExam>) => {
            deferred.resolve(resp.data);
        }, err => {
            toast.error(err.data);
            deferred.reject(err);
        });
        return deferred.promise;
    }

}
