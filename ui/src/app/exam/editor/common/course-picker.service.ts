// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Course } from 'src/app/exam/exam.model';

@Injectable({ providedIn: 'root' })
export class CoursePickerService {
    constructor(private http: HttpClient) {}

    getCourses$ = (filter: string, criteria: string) =>
        this.http.get<Course[]>('/app/courses', {
            params: { filter: filter, q: criteria },
        });
}
