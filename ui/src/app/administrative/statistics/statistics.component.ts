// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
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
export class StatisticsComponent {
    departments = signal<Departments[]>([]);
    startDate = signal<Date | null>(null);
    endDate = signal<Date | null>(null);

    filteredDepartments = computed(() => {
        const filter = this._departmentFilter().toLowerCase();
        if (filter === '') {
            return this.departments();
        }
        return this.departments().filter((d) => d.name.toLowerCase().includes(filter));
    });

    queryParams = computed<QueryParams>(() => {
        const params: { start?: string; end?: string; dept?: string } = {};
        const currentStartDate = this.startDate();
        const currentEndDate = this.endDate();
        if (currentStartDate) {
            params.start = currentStartDate.toISOString();
        }
        if (currentEndDate) {
            params.end = currentEndDate.toISOString();
        }
        const filteredDepts = this.departments().filter((d) => d.filtered);
        if (filteredDepts.length > 0) {
            params.dept = filteredDepts.map((d) => d.name).join();
        }
        return params;
    });

    private _view = signal<Tab>(Tab.RESPONSES);
    private _departmentFilter = signal('');
    private Statistics = inject(StatisticsService);

    constructor() {
        this.Statistics.listDepartments$().subscribe((resp) => {
            const depts = resp.departments.map((d) => ({ name: d, filtered: false }));
            this.departments.set(depts);
        });
    }

    get view(): Tab {
        return this._view();
    }

    get departmentFilter(): string {
        return this._departmentFilter();
    }

    set view(value: Tab) {
        this._view.set(value);
    }

    set departmentFilter(value: string) {
        this._departmentFilter.set(value);
    }

    setDepartmentFilter(dept: Departments) {
        const updatedDepts = this.departments().map((d) =>
            d.name === dept.name ? { ...d, filtered: !d.filtered } : d,
        );
        this.departments.set(updatedDepts);
    }

    startDateChanged(event: { date: Date | null }) {
        this.startDate.set(event.date);
    }

    endDateChanged(event: { date: Date | null }) {
        this.endDate.set(event.date);
    }

    handleDepartmentInputChange() {
        // The computed signal will automatically update when _departmentFilter changes
        // This method is kept for the template event handler but doesn't need to do anything
    }
}
