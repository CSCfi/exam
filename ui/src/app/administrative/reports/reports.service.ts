// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface ExamName {
    id: number;
    name: string;
    course: {
        id: number;
        name: string;
        code: string;
    };
}

export enum FileType {
    JSON = 'json',
    XLSX = 'xlsx',
}

export enum UserRole {
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT',
    ADMIN = 'ADMIN',
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
    constructor(private http: HttpClient) {}

    examNames = () => this.http.get<ExamName[]>('/app/statistics/examnames');
}
