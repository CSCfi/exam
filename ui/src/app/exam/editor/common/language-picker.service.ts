// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class LanguagePickerService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    updateExamLanguage$ = (examId: number, languageCode: string, collaborative = false): Observable<void> => {
        const resource = collaborative ? '/app/iop/exams' : '/app/exams';
        return this.http
            .put<void>(`${resource}/${examId}/language/${languageCode}`, {})
            .pipe(catchError((err) => this.errorHandler.handle(err, 'LanguagePickerService.updateExamLanguage$')));
    };
}
