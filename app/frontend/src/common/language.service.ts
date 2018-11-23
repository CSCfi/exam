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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ExamLanguage } from '../exam/exam.model';

export interface ISOLang {
    name: string;
    nativeName: string;
}

export interface ISOLangMap {
    [code: string]: ISOLang;
}

@Injectable()
export class LanguageService {

    constructor(private http: HttpClient) { }

    private isoLangs: ISOLangMap = require('./resource/languages');

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

    getExamLanguages(): Promise<ExamLanguage[]> {

        return new Promise((resolve, reject) => {
            this.http.get<ExamLanguage[]>('/app/languages').subscribe(resp => {
                resolve(resp);
            }, err => reject(err));
        });
    }

    getLanguages = () => Object.keys(this.isoLangs).map(k => this.isoLangs[k]);

}
