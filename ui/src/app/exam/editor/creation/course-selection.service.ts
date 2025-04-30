// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class CourseSelectionService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    getExam$ = (id: number): Observable<Exam> =>
        this.http
            .get<Exam>(`/app/exams/${id}`)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'CourseSelectionService.getExam$')));

    associateCourse$ = (examId: number, courseId: number): Observable<void> =>
        this.http
            .put<void>(`/app/exams/${examId}/course/${courseId}`, {})
            .pipe(catchError((err) => this.errorHandler.handle(err, 'CourseSelectionService.associateCourse$')));

    deleteExam$ = (examId: number): Observable<void> =>
        this.http
            .delete<void>(`/app/exams/${examId}`)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'CourseSelectionService.deleteExam$')));
}
