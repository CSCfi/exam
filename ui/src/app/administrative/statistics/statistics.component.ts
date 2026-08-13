// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
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
        NgbNavModule,
        NgbDropdownModule,
        TranslateModule,
        DatePickerComponent,
        IopReservationStatisticsComponent,
        RoomStatisticsComponent,
        ReservationStatisticsComponent,
        ResponseStatisticsComponent,
        ExamStatisticsComponent,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class StatisticsComponent {
    readonly departments = signal<Departments[]>([]);
    readonly startDate = signal<Date | null>(null);
    readonly endDate = signal<Date | null>(null);

    readonly filteredDepartments = computed(() => {
        const filter = this._departmentFilter().toLowerCase();
        if (filter === '') {
            return this.departments();
        }
        return this.departments().filter((d) => d.name.toLowerCase().includes(filter));
    });

    readonly queryParams = computed<QueryParams>(() => {
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

    private readonly _view = signal<Tab>(Tab.RESPONSES);
    private readonly _departmentFilter = signal('');
    private readonly Statistics = inject(StatisticsService);

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

    onDepartmentFilterInput = (event: Event) => {
        this.departmentFilter = (event.target as HTMLInputElement).value;
    };
}
