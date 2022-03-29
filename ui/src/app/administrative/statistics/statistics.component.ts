/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';

interface Departments {
    name: string;
    filtered: boolean;
}

enum Tab {
    RESPONSES = 'RESPONSES',
    ROOMS = 'ROOMS',
    EXAMS = 'EXAMS',
    RESERVATIONS = 'RESERVATIONS',
}
export type QueryParams = { start?: string; end?: string; dept?: string };
@Component({
    templateUrl: './statistics.component.html',
    selector: 'statistics',
})
export class StatisticsComponent implements OnInit {
    view: Tab = Tab.RESPONSES;
    departments: Departments[] = [];
    filteredDepartments: Departments[] = [];
    limitations = { department: '' };
    queryParams: QueryParams = {};
    startDate: Date | null = null;
    endDate: Date | null = null;

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.http.get<{ departments: string[] }>('/app/reports/departments').subscribe((resp) => {
            this.departments = resp.departments.map((d) => ({ name: d, filtered: false }));
            this.filteredDepartments = this.departments;
        });
    }

    private setQueryParams = () => {
        const params: { start?: string; end?: string; dept?: string } = {};
        if (this.startDate) {
            params.start = this.startDate.toISOString();
        }
        if (this.endDate) {
            params.end = this.endDate.toISOString();
        }
        const departments = this.departments.filter((d) => d.filtered);
        if (departments.length > 0) {
            params.dept = departments.map((d) => d.name).join();
        }
        this.queryParams = params;
    };

    setDepartmentFilter = (dept: { name: string; filtered: boolean }) => {
        dept.filtered = !dept.filtered;
        this.setQueryParams();
    };

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
        this.setQueryParams();
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
        this.setQueryParams();
    };

    handleDepartmentInputChange = () => {
        if (this.limitations.department === '') {
            this.filteredDepartments = this.departments;
        } else {
            this.filteredDepartments = this.departments.filter((d) =>
                d.name.toLowerCase().includes(this.limitations.department.toLowerCase()),
            );
        }
    };
}
