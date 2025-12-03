// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbNav,
    NgbNavItem,
    NgbNavItemRole,
    NgbNavLink,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { QueryParams } from 'src/app/administrative/administrative.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { ExamStatisticsComponent } from './categories/exam-statistics.component';
import { IopReservationStatisticsComponent } from './categories/iop-reservation-statistics.component';
import { ReservationStatisticsComponent } from './categories/reservation-statistics.component';
import { ResponseStatisticsComponent } from './categories/response-statistics.component';
import { RoomStatisticsComponent } from './categories/room-statistics.component';
import { StatisticsService } from './statistics.service';

interface Departments {
    name: string;
    filtered: boolean;
}

enum Tab {
    RESPONSES = 'RESPONSES',
    ROOMS = 'ROOMS',
    EXAMS = 'EXAMS',
    RESERVATIONS = 'RESERVATIONS',
    IOP_RESERVATIONS = 'IOP_RESERVATIONS',
}

@Component({
    templateUrl: './statistics.component.html',
    selector: 'xm-statistics',
    imports: [
        NgbNav,
        NgbNavItem,
        NgbNavItemRole,
        NgbNavLink,
        DatePickerComponent,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        FormsModule,
        NgbDropdownItem,
        NgClass,
        IopReservationStatisticsComponent,
        RoomStatisticsComponent,
        ReservationStatisticsComponent,
        ResponseStatisticsComponent,
        ExamStatisticsComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class StatisticsComponent implements OnInit {
    view: Tab = Tab.RESPONSES;
    departments: Departments[] = [];
    filteredDepartments: Departments[] = [];
    limitations = { department: '' };
    queryParams: QueryParams = {};
    startDate: Date | null = null;
    endDate: Date | null = null;

    private Statistics = inject(StatisticsService);

    ngOnInit() {
        this.Statistics.listDepartments$().subscribe((resp) => {
            this.departments = resp.departments.map((d) => ({ name: d, filtered: false }));
            this.filteredDepartments = this.departments;
        });
    }

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
}
