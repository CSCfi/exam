// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Software } from 'src/app/facility/facility.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class SoftwarePickerService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    getSoftwares$ = (): Observable<Software[]> =>
        this.http
            .get<Software[]>('/app/softwares')
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SoftwarePickerService.getSoftwares$')));

    updateExamSoftware$ = (examId: number, softwareId: number): Observable<void> =>
        this.http
            .put<void>(`/app/exam/${examId}/software/${softwareId}`, {})
            .pipe(catchError((err) => this.errorHandler.handle(err, 'SoftwarePickerService.updateExamSoftware$')));
}
