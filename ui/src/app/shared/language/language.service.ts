// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Exam, ExamLanguage } from 'src/app/exam/exam.model';

interface IsoLang {
    name: string;
    nativeName: string;
}

interface IsoLangMap {
    [code: string]: IsoLang;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
    private isoLangs: IsoLangMap = {
        en: { name: 'English', nativeName: 'English' },
        fi: { name: 'Finnish', nativeName: 'suomi' },
        sv: { name: 'Swedish', nativeName: 'svenska' },
        de: { name: 'German', nativeName: 'Deutsch' },
    };

    constructor(private http: HttpClient) {}

    getLanguageName = (code: string) => {
        const key = code.slice(0, 2);
        const lang = this.isoLangs[key];
        return lang.name;
    };

    getLanguageNativeName = (code: string, exam: Exam) => {
        const lang = exam.examLanguages.find((el) => el.code === code);
        return lang ? lang.name : '';
    };

    getExamLanguages$ = (): Observable<ExamLanguage[]> => this.http.get<ExamLanguage[]>('/app/languages');
}
