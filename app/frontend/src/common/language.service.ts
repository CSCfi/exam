/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the 'Licence');
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an 'AS IS' basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import * as angular from 'angular';

import { ExamLanguage } from '../exam/exam.model';


export interface IsoLang {
    name: string;
    nativeName: string;
}

export interface IsoLangMap {
    [code: string]: IsoLang;
}

export class LanguageService {

    constructor(
        private $q: angular.IQService,
        private $http: angular.IHttpService) {
        'ngInject';
    }

    private isoLangs: IsoLangMap = require('./resource/languages');

    getLanguageName = (code: string) => {
        const key = code.slice(0, 2);
        const lang = this.isoLangs[key];
        return lang ? lang.name : undefined;
    }

    getLanguageNativeName = (code: string) => {
        const key = code.slice(0, 2);
        const lang = this.isoLangs[key];
        return lang ? lang.nativeName : undefined;
    }

    getExamLanguages(): angular.IPromise<ExamLanguage[]> {
        const deferred: ng.IDeferred<ExamLanguage[]> = this.$q.defer();
        this.$http.get('/app/languages').then(
            (resp: angular.IHttpResponse<ExamLanguage[]>) => {
                deferred.resolve(resp.data);
            }).catch((err) => deferred.reject(err));
        return deferred.promise;
    }

    getLanguages = () => Object.keys(this.isoLangs).map(k => this.isoLangs[k]);

}

angular.module('app.common').factory('Language', LanguageService);
