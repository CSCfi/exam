// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

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
    constructor(private http: HttpClient) {}

    examNames = () => this.http.get<ExamName[]>('/app/statistics/examnames');
}
