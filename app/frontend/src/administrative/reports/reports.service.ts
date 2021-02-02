import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

@Injectable()
export class ReportsService {
    constructor(private http: HttpClient) {}

    examNames = () => this.http.get<ExamName[]>('/app/statistics/examnames');
}
