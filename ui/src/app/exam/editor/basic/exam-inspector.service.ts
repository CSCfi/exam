// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { ExamInspection } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class ExamInspectorService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    searchTeachers$ = (examId: number, searchText: string): Observable<User[]> =>
        this.http
            .get<User[]>(`/app/users/filter/TEACHER/${examId}`, { params: { q: searchText } })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'ExamInspectorService.searchTeachers$')));

    getInspections$ = (examId: number): Observable<ExamInspection[]> =>
        this.http
            .get<ExamInspection[]>(`/app/exam/${examId}/inspections`)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'ExamInspectorService.getInspections$')));

    addInspector$ = (examId: number, userId: number, comment?: string): Observable<void> =>
        this.http
            .post<void>(`/app/exams/${examId}/inspector/${userId}`, { comment })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'ExamInspectorService.addInspector$')));

    removeInspector$ = (inspectorId: number): Observable<void> =>
        this.http
            .delete<void>(`/app/exams/inspector/${inspectorId}`)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'ExamInspectorService.removeInspector$')));
}
