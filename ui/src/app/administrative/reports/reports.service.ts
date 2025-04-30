// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

interface ExamName {
    id: number;
    name: string;
    course: {
        id: number;
        name: string;
        code: string;
    };
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    examNames = (): Observable<ExamName[]> =>
        this.http
            .get<ExamName[]>('/app/statistics/examnames')
            .pipe(catchError((err) => this.errorHandler.handle(err, 'ReportsService.examNames')));
}
